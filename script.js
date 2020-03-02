/* jshint esversion: 6 */
(function ($) {
    const FAVRO_EMAIL_KEY_NAME = 'favro_email';
    const FAVRO_API_KEY_NAME = 'favro_api_key';
    const FAVRO_TICKET_PREFIX_KEY_NAME = 'favro_ticket_prefix';
    const FAVRO_ORGANIZATION_ID_KEY_NAME = 'favro_organization_id';
    const FAVRO_COLUMNS_TO_TRACK = 'favro_columns_to_track';
    const FAVRO_PID_CUSTOM_FIELD_ID_KEY_NAME = 'favro_pid_custom_field_id';
    const FAVRO_API_BASE_URL = 'https://favro.com/api/v1';

    const TOGGL_API_KEY_NAME = 'toggl_api_key';
    const TOGGL_DEFAULT_PID_KEY_NAME = 'toggl_default_pid';
    const TOGGL_API_BASE_URL = 'https://www.toggl.com/api/v8';

    const TICKET_NAME_SUFFIX = ' (Auto-Toggl)';

    const ENV_VALUES = [
        FAVRO_EMAIL_KEY_NAME,
        FAVRO_API_KEY_NAME,
        FAVRO_TICKET_PREFIX_KEY_NAME,
        FAVRO_ORGANIZATION_ID_KEY_NAME,
        FAVRO_PID_CUSTOM_FIELD_ID_KEY_NAME,
        FAVRO_COLUMNS_TO_TRACK,

        TOGGL_API_KEY_NAME,
        TOGGL_DEFAULT_PID_KEY_NAME
    ];

    const TIMEOUT_BEFORE_TRACKING = 5000;

    function start() {
        $.noConflict();
        ensureEnvironmentVariables();
        window.setInterval(detectOpenCardChanges(onOpenCardChange($)), 1000);
        window.onbeforeunload = stopTimeEntry;
    }

    function ensureEnvironmentVariables() {
        ENV_VALUES.forEach(async key => {
            await GM.getValue(key) || GM.setValue(key, prompt(key));
        });
    }

    function detectOpenCardChanges(onChange) {
        let currentOpenCardId = null;
        return async () => {
            const ticketPrefix = await GM.getValue(FAVRO_TICKET_PREFIX_KEY_NAME);
            const regex = new RegExp('\\?card=' + ticketPrefix + '([\\d]+)', 'i');
            let search = new URL(location.href).search;
            let matches = regex.exec(search);
            let openCard = matches === null ? null : parseInt(matches[1]);
            if (openCard !== currentOpenCardId) {
                const oldValue = currentOpenCardId;
                currentOpenCardId = openCard;
                onChange(oldValue, openCard);
            }
        }
    }

    function beforeSendFavro(favroToken, email, organizationId) {
        return (xhr) => {
            xhr.setRequestHeader('Authorization', 'Basic ' + btoa(email + ':' + favroToken));
            xhr.setRequestHeader('organizationId', organizationId);
            xhr.setRequestHeader('Content-Type', 'application/json');
        }
    }

    function getTogglHeaders(togglToken) {
        return {
            'Authorization': 'Basic ' + btoa(togglToken + ':api_token'),
            'Content-Type': 'application/json'
        };
    }

    function getTogglPid(customFields, pidCustomFieldId) {
        if (!customFields) {
            return null;
        }

        let pid = null;
        customFields.forEach(customField => {
            if (customField.customFieldId === pidCustomFieldId) {
                pid = customField.total;
                return true;
            }
        });

        return pid;
    }

    let timeEntryId = null;
    let timeEntryTimoutId = null;

    function startTimeEntry(card) {
        stopTimeEntry();

        timeEntryTimoutId = window.setTimeout(async () => {
            const description = await GM.getValue(FAVRO_TICKET_PREFIX_KEY_NAME) + card.sequentialId + ' / ' + card.name + TICKET_NAME_SUFFIX;
            const togglToken = await GM.getValue(TOGGL_API_KEY_NAME);
            const pidCustomFieldId = await GM.getValue(FAVRO_PID_CUSTOM_FIELD_ID_KEY_NAME);
            let pid = getTogglPid(card.customFields, pidCustomFieldId);
            if (!pid) {
                pid = await GM.getValue(TOGGL_DEFAULT_PID_KEY_NAME);
            }
            const data = JSON.stringify({time_entry: {pid: pid, description: description, created_with: 'tampermonkey'}});
            GM.xmlHttpRequest({
                method: 'POST',
                url: TOGGL_API_BASE_URL + '/time_entries/start',
                data: data,
                headers: getTogglHeaders(togglToken),
                onload: (res) => {
                    timeEntryId = JSON.parse(res.response).data.id;
                    const togglButtonId = 'button_' + timeEntryId;
                    const togglButton = $('<button id="' + togglButtonId + '" type="button" style="border:none;background:none;cursor:pointer;">' +
                        '<img src="https://web-assets.toggl.com/app/assets/images/favicon.b87d0d2d.ico" style="width:20px;height:20px;"></button>');
                    togglButton.click(() => {
                        stopTimeEntry();
                        $('#' + togglButtonId).remove();
                    });
                    $('#' + card.cardId + '.cardeditor').find('.cardeditor-topbar .buttons').append(togglButton);
                }
            });
        }, TIMEOUT_BEFORE_TRACKING);
    }

    async function stopTimeEntry() {
        if (timeEntryTimoutId) {
            window.clearTimeout(timeEntryTimoutId);
        }

        if (!timeEntryId) {
            return;
        }

        const currentTimeEntryId = timeEntryId;
        timeEntryId = null;
        const togglToken = await GM.getValue(TOGGL_API_KEY_NAME);
        GM.xmlHttpRequest({
            method: 'PUT',
            url: TOGGL_API_BASE_URL + '/time_entries/' + currentTimeEntryId + '/stop',
            headers: getTogglHeaders(togglToken),
        });
    }

    function onOpenCardChange($) {
        return async (oldCard, newCard) => {
            await stopTimeEntry();
            if (!newCard) {
                return;
            }
            const sequentialId = await GM.getValue(FAVRO_TICKET_PREFIX_KEY_NAME) + newCard;
            const favroToken = await GM.getValue(FAVRO_API_KEY_NAME);
            const email = await GM.getValue(FAVRO_EMAIL_KEY_NAME);
            const organizationId = await GM.getValue(FAVRO_ORGANIZATION_ID_KEY_NAME);
            const columnsToTrack = (await GM.getValue(FAVRO_COLUMNS_TO_TRACK, '')).split(',');
            $.ajax({
                type: 'GET',
                url: FAVRO_API_BASE_URL + '/cards?cardSequentialId=' + sequentialId,
                beforeSend: beforeSendFavro(favroToken, email, organizationId),
                success: (res) => {
                    const card = res.entities[0];
                    if (!card) {
                        GM.notification({text: 'No card found in favro for sequentialId' + sequentialId});
                        return;
                    }

                    if (columnsToTrack.length !== 0) {
                        let found = false;
                        const selector = '.boardcolumn .carditem .card-title-text:contains(\'' + $.escapeSelector(card.name) + '\')';
                        $(selector).parents('.boardcolumn').each((index, elem) => {
                            const columnId = $(elem).attr('id');
                            if (columnsToTrack.indexOf(columnId) !== -1) {
                                return found = true;
                            }
                        });
                        if (!found) {
                            return;
                        }
                    }

                    startTimeEntry(card);
                },
                error: err => {
                    GM.notification({text: 'Card sequentialId' + sequentialId + ' fetch error: ' + err});
                }
            });
        };
    }

    start();
})(window.jQuery);
