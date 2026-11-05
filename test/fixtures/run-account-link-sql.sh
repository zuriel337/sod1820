set -e
PSQL="psql -h /tmp -p 55432 -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -c "drop database if exists linktest" -c "create database linktest" >/dev/null
cd /home/user/sod1820
P="psql -h /tmp -p 55432 -U postgres -d linktest -v ON_ERROR_STOP=1"
$P -q -f test/fixtures/account-link-offers.fixture.sql >/dev/null
$P -q -f supabase/migrations/20261105150000_account_link_offers_v1.sql >/dev/null
$P -f test/fixtures/account-link-offers.scenarios.sql 2>&1
