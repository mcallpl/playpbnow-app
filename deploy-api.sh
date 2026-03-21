#!/usr/bin/env expect
# Deploy PlayPBNow API files to GoDaddy via SFTP

set timeout 120
set host "peoplestar.com"
set user "x2v8n84ca09w"
set pass "CJsdadsnooch222#"
set remote_dir "public_html/PlayPBNow/api"
set remote_root "public_html/PlayPBNow"

puts "=== Deploying PlayPBNow API + Pages ==="

spawn sftp $user@$host
expect "password:"
send "$pass\r"
expect "sftp>"

# Upload API files
send "lcd playpbnow-api\r"
expect "sftp>"

foreach f {email_login.php forgot_password.php change_password.php check_phone.php send_verification_code.php verify_code.php review_login.php check_subscription.php activate_subscription.php get_user_profile.php update_user_profile.php create_group.php get_groups.php get_group_details.php save_group.php update_group.php delete_group.php save_group_roster.php add_player.php get_players.php get_all_players.php update_player.php delete_player.php update_player_stats.php search_players.php save_scores.php get_rankings.php get_leaderboard.php get_head_to_head.php save_players.php add_players_to_group.php create_live_session.php get_live_session.php update_live_score.php get_universal_sessions.php delete_session.php delete_match.php update_match.php join_match.php generate_schedule.php generate_report_image.php player_register.php pool_players_api.php invite_api.php invite_respond.php sms_credits_api.php stripe_webhook.php migrate_players_and_invites.php add_pool_fields.php court_cities.php get_courts.php add_court.php broadcast_api.php freestyle_sms_api.php admin_api.php ai_generate.php media_upload.php collab_create_session.php collab_join_match.php collab_get_scores.php collab_sync_scores.php collab_update_schedule.php run_collab_alter.php invite_chat_send.php invite_chat_poll.php revenuecat_webhook.php privacy.html terms.html} {
    puts "\n--- Uploading $f ---"
    send "put $f ${remote_dir}/$f\r"
    expect "sftp>"
}

# Upload player signup page
send "lcd ../public\r"
expect "sftp>"
puts "\n--- Uploading player-signup.html ---"
send "put player-signup.html ${remote_root}/player-signup.html\r"
expect "sftp>"

puts "\n--- Uploading invite.html ---"
send "put invite.html ${remote_root}/invite.html\r"
expect "sftp>"

puts "\n--- Uploading broadcast.html ---"
send "put broadcast.html ${remote_root}/broadcast.html\r"
expect "sftp>"

# Create uploads directory for media
puts "\n--- Creating uploads directory ---"
send "mkdir ${remote_dir}/uploads\r"
expect "sftp>"

puts "\n--- Deploy complete! ---"
send "bye\r"
expect eof

puts "\nDone!"
puts "Player signup: https://peoplestar.com/PlayPBNow/player-signup.html"
