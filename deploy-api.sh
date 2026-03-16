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

foreach f {migrate_players_and_invites.php player_register.php pool_players_api.php invite_api.php invite_respond.php sms_credits_api.php stripe_webhook.php add_pool_fields.php court_cities.php broadcast_api.php admin_api.php ai_generate.php media_upload.php collab_create_session.php collab_join_match.php collab_get_scores.php collab_sync_scores.php collab_update_schedule.php run_collab_alter.php privacy.html terms.html} {
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
