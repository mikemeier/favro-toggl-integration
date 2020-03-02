Installation
============
- Visit favro.com
- Add a custom field (On open card) -> Create custom Field -> Name = Toggl Project Id (What ever you like) / Type = Number
- Install UserScript Favro - Toggl Timer
- Visit favro.com
- Fill out every needed key (prompt fields)
- Open a favro ticket -> tracking will start after 5s

Optional configuration via storage:
{
  "favro_email": "favro_email@example.com",
  "favro_api_key": "your_favro_api_key",
  "favro_ticket_prefix": "XXX-",
  "favro_organization_id": "favro_organization_id",
  "favro_columns_to_track": "AAbbCCddEE,FFggHHiiJJ",
  "favro_pid_custom_field_id": "toggl_custom_field_id_for_different_pid",
  "toggl_api_key": "toggl_api_key",
  "toggl_default_pid": 1234
}
