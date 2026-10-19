# API coverage

Contract retrieved: 2026-10-19. [Official OpenAPI](https://codemagic.io/api/v3/schema/openapi.json).

Generated from the bundled contract. These are implemented mappings, not claims of live-account validation.

The v3 API-token read/revoke routes are excluded. Deprecated OTA aliases are included alongside their canonical routes. Legacy routes supplement gaps in v3. No private browser endpoints are used.

| Tool | Method | Route | Toolset | Write mode |
| --- | --- | --- | --- | --- |
| cm_delete_ota_access_keys_by_key_id | DELETE | /api/v3/ota/{team_id}/access-keys/{key_id} | all | all |
| cm_delete_previews_by_preview_id | DELETE | /api/v3/previews/{preview_id} | all | all |
| cm_delete_teams_audit_log_connector | DELETE | /api/v3/teams/{team_id}/audit-log-connector | all | all |
| cm_delete_teams_external_recipients_by_recipient_id | DELETE | /api/v3/teams/{team_id}/external-recipients/{recipient_id} | all | all |
| cm_delete_teams_invitations_by_invitation_id | DELETE | /api/v3/teams/{team_id}/invitations/{invitation_id} | all | all |
| cm_delete_teams_memberships_by_user_id | DELETE | /api/v3/teams/{team_id}/memberships/{user_id} | all | all |
| cm_delete_teams_subscriptions_by_subscription_id | DELETE | /api/v3/teams/{team_id}/subscriptions/{subscription_id} | all | all |
| cm_delete_tester_groups_by_tester_group_id | DELETE | /api/v3/tester-groups/{tester_group_id} | all | all |
| cm_delete_tester_groups_contacts_by_contact_id | DELETE | /api/v3/tester-groups/{tester_group_id}/contacts/{contact_id} | all | all |
| cm_delete_user_memberships_by_team_id | DELETE | /api/v3/user/memberships/{team_id} | all | all |
| cm_delete_variable_groups_by_variable_group_id | DELETE | /api/v3/variable-groups/{variable_group_id} | all | all |
| cm_delete_variable_groups_variables_by_variable_id | DELETE | /api/v3/variable-groups/{variable_group_id}/variables/{variable_id} | all | all |
| cm_get_apps_tester_groups | GET | /api/v3/apps/{app_id}/tester-groups | all | any |
| cm_get_apps_variable_groups | GET | /api/v3/apps/{app_id}/variable-groups | all | any |
| cm_get_build | GET | /api/v3/builds/{build_id} | core + all | any |
| cm_get_build_actions | GET | /api/v3/builds/{build_id}/actions | core + all | any |
| cm_get_build_remote_access | GET | /api/v3/builds/{build_id}/remote-access | core + all | any |
| cm_get_dashboards_builds | GET | /api/v3/dashboards/{uuid}/builds | all | any |
| cm_get_dashboards_by_uuid | GET | /api/v3/dashboards/{uuid} | all | any |
| cm_get_invitations_public_by_code | GET | /api/v3/invitations/public/{code} | all | any |
| cm_get_meta | GET | /api/v3/meta | all | any |
| cm_get_meta_shorebird | GET | /api/v3/meta/shorebird | all | any |
| cm_get_ota | GET | /api/v3/ota | all | any |
| cm_get_ota_access_keys | GET | /api/v3/ota/{team_id}/access-keys | all | any |
| cm_get_ota_deployments_releases | GET | /api/v3/ota/deployments/{deployment_id}/releases | all | any |
| cm_get_ota_deployments_usage_by_metric | GET | /api/v3/ota/deployments/{deployment_id}/usage/{metric} | all | any |
| cm_get_ota_projects | GET | /api/v3/ota/{team_id}/projects | all | any |
| cm_get_ota_projects_deployment_keys | GET | /api/v3/ota/projects/{project_id}/deployment-keys | all | any |
| cm_get_ota_usage | GET | /api/v3/ota/{team_id}/usage | all | any |
| cm_get_over_the_air_updates | GET | /api/v3/over-the-air-updates | all | any |
| cm_get_over_the_air_updates_deployments_releases | GET | /api/v3/over-the-air-updates/deployments/{deployment_id}/releases | all | any |
| cm_get_over_the_air_updates_deployments_usage_by_metric | GET | /api/v3/over-the-air-updates/deployments/{deployment_id}/usage/{metric} | all | any |
| cm_get_over_the_air_updates_projects | GET | /api/v3/over-the-air-updates/{team_id}/projects | all | any |
| cm_get_over_the_air_updates_projects_deployment_keys | GET | /api/v3/over-the-air-updates/projects/{project_id}/deployment-keys | all | any |
| cm_get_over_the_air_updates_usage | GET | /api/v3/over-the-air-updates/{team_id}/usage | all | any |
| cm_get_previews_by_preview_id | GET | /api/v3/previews/{preview_id} | all | any |
| cm_get_shared_dashboards_builds | GET | /api/v3/shared-dashboards/{uuid}/builds | all | any |
| cm_get_shared_dashboards_by_uuid | GET | /api/v3/shared-dashboards/{uuid} | all | any |
| cm_get_shared_previews_by_shared_preview_id | GET | /api/v3/shared-previews/{shared_preview_id} | all | any |
| cm_get_team | GET | /api/v3/teams/{team_id} | core + all | any |
| cm_get_teams_analytics_build_duration_percentiles | GET | /api/v3/teams/{team_id}/analytics/build-duration-percentiles | all | any |
| cm_get_teams_analytics_builds | GET | /api/v3/teams/{team_id}/analytics/builds | all | any |
| cm_get_teams_analytics_builds_by_status | GET | /api/v3/teams/{team_id}/analytics/builds-by-status | all | any |
| cm_get_teams_analytics_builds_by_status_over_time | GET | /api/v3/teams/{team_id}/analytics/builds-by-status-over-time | all | any |
| cm_get_teams_analytics_queued_time_percentiles | GET | /api/v3/teams/{team_id}/analytics/queued-time-percentiles | all | any |
| cm_get_teams_analytics_summary | GET | /api/v3/teams/{team_id}/analytics/summary | all | any |
| cm_get_teams_audit_log | GET | /api/v3/teams/{team_id}/audit-log | all | any |
| cm_get_teams_audit_log_connector | GET | /api/v3/teams/{team_id}/audit-log-connector | all | any |
| cm_get_teams_cards | GET | /api/v3/teams/{team_id}/cards | all | any |
| cm_get_teams_customer | GET | /api/v3/teams/{team_id}/customer | all | any |
| cm_get_teams_external_recipients | GET | /api/v3/teams/{team_id}/external-recipients | all | any |
| cm_get_teams_invitations | GET | /api/v3/teams/{team_id}/invitations | all | any |
| cm_get_teams_invoices | GET | /api/v3/teams/{team_id}/invoices | all | any |
| cm_get_teams_members | GET | /api/v3/teams/{team_id}/members | all | any |
| cm_get_teams_previews | GET | /api/v3/teams/{team_id}/previews | all | any |
| cm_get_teams_subscriptions | GET | /api/v3/teams/{team_id}/subscriptions | all | any |
| cm_get_teams_subscriptions_by_subscription_id | GET | /api/v3/teams/{team_id}/subscriptions/{subscription_id} | all | any |
| cm_get_teams_subscriptions_invoice_preview | GET | /api/v3/teams/{team_id}/subscriptions/{subscription_id}/invoice-preview | all | any |
| cm_get_teams_subscriptions_invoices | GET | /api/v3/teams/{team_id}/subscriptions/{subscription_id}/invoices | all | any |
| cm_get_teams_variable_groups | GET | /api/v3/teams/{team_id}/variable-groups | all | any |
| cm_get_tester_groups_by_tester_group_id | GET | /api/v3/tester-groups/{tester_group_id} | all | any |
| cm_get_tester_groups_contacts | GET | /api/v3/tester-groups/{tester_group_id}/contacts | all | any |
| cm_get_user | GET | /api/v3/user | core + all | any |
| cm_get_user_notifications | GET | /api/v3/user/notifications | all | any |
| cm_get_user_preferences | GET | /api/v3/user/preferences | all | any |
| cm_get_user_teams_permissions | GET | /api/v3/user/teams/{team_id}/permissions | all | any |
| cm_get_variable_groups_by_variable_group_id | GET | /api/v3/variable-groups/{variable_group_id} | all | any |
| cm_get_variable_groups_variables | GET | /api/v3/variable-groups/{variable_group_id}/variables | all | any |
| cm_get_variable_groups_variables_by_variable_id | GET | /api/v3/variable-groups/{variable_group_id}/variables/{variable_id} | all | any |
| cm_list_apps | GET | /api/v3/user/apps | core + all | any |
| cm_list_builds | GET | /api/v3/teams/{team_id}/builds | core + all | any |
| cm_list_team_apps | GET | /api/v3/teams/{team_id}/apps | core + all | any |
| cm_list_teams | GET | /api/v3/user/teams | core + all | any |
| cm_list_workflows | GET | /api/v3/apps/{app_id}/workflows | core + all | any |
| cm_patch_dashboards_by_dashboard_id | PATCH | /api/v3/dashboards/{dashboard_id} | all | all |
| cm_patch_subscriptions_features | PATCH | /api/v3/subscriptions/{team_id}/features | all | all |
| cm_patch_tester_groups_by_tester_group_id | PATCH | /api/v3/tester-groups/{tester_group_id} | all | all |
| cm_patch_variable_groups_by_variable_group_id | PATCH | /api/v3/variable-groups/{variable_group_id} | all | all |
| cm_patch_variable_groups_variables_by_variable_id | PATCH | /api/v3/variable-groups/{variable_group_id}/variables/{variable_id} | all | all |
| cm_post_apps_tester_groups | POST | /api/v3/apps/{app_id}/tester-groups | all | all |
| cm_post_apps_variable_groups | POST | /api/v3/apps/{app_id}/variable-groups | all | all |
| cm_post_builds_preview | POST | /api/v3/builds/{build_id}/preview | all | all |
| cm_post_invitations_accept | POST | /api/v3/invitations/{code}/accept | all | all |
| cm_post_ota_access_keys | POST | /api/v3/ota/{team_id}/access-keys | all | all |
| cm_post_previews_share | POST | /api/v3/previews/{preview_id}/share | all | all |
| cm_post_teams_external_recipients | POST | /api/v3/teams/{team_id}/external-recipients | all | all |
| cm_post_teams_invitations | POST | /api/v3/teams/{team_id}/invitations | all | all |
| cm_post_teams_invoice_preview | POST | /api/v3/teams/{team_id}/invoice-preview | all | all |
| cm_post_teams_subscriptions | POST | /api/v3/teams/{team_id}/subscriptions | all | all |
| cm_post_teams_subscriptions_promotion_code | POST | /api/v3/teams/{team_id}/subscriptions/{subscription_id}/promotion-code | all | all |
| cm_post_teams_variable_groups | POST | /api/v3/teams/{team_id}/variable-groups | all | all |
| cm_post_tester_groups_contacts | POST | /api/v3/tester-groups/{tester_group_id}/contacts | all | all |
| cm_post_variable_groups_variables | POST | /api/v3/variable-groups/{variable_group_id}/variables | all | all |
| cm_put_teams_audit_log_connector | PUT | /api/v3/teams/{team_id}/audit-log-connector | all | all |
| cm_put_teams_customer_default_payment_method | PUT | /api/v3/teams/{team_id}/customer/default-payment-method | all | all |
| cm_put_teams_memberships_by_user_id | PUT | /api/v3/teams/{team_id}/memberships/{user_id} | all | all |
| cm_put_teams_subscriptions_default_payment_method | PUT | /api/v3/teams/{team_id}/subscriptions/{subscription_id}/default-payment-method | all | all |
| cm_start_build | POST | /api/v3/apps/{app_id}/builds | core + all | builds / all |
| cm_get_app | GET | /apps/{app_id} | core + all | any |
| cm_add_app | POST | /apps | core + all | all |
| cm_add_private_app | POST | /apps/new | core + all | all |
| cm_cancel_build | POST | /builds/{build_id}/cancel | core + all | builds / all |
| cm_list_caches | GET | /apps/{app_id}/caches | core + all | any |
| cm_delete_caches | DELETE | /apps/{app_id}/caches | core + all | all |
| cm_delete_cache | DELETE | /apps/{app_id}/caches/{cache_id} | core + all | all |
| cm_create_artifact_link | POST | /artifacts/{artifact_path}/public-url | core + all | all |
