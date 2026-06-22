#!/usr/bin/env bash
# Sample seed: France — 3 cities, 5 real hotels each. For format review.
set -u
RES="--resolve whholidays.com:443:50.6.34.45"
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36"
USER="moatazatiaa10@gmail.com"
PASS="XFVlOQEtX1XMa0Fay8kuHfQK"
CITIES_EP="https://whholidays.com/wp-json/whholidays/v1/cities"
HOTELS_EP="https://whholidays.com/wp-json/whholidays/v1/hotels"

post() { # endpoint json
  curl -s $RES -A "$UA" -u "$USER:$PASS" -o /dev/null -w "%{http_code}" \
    -X POST "$1" -H "Content-Type: application/json" -d "$2"
}

COUNTRY="France"
# city_name
CITIES=( "Paris" "Nice" "Lyon" )
# city|hotel|stars
HOTELS=(
"Paris|The Ritz Paris|5"
"Paris|Four Seasons Hotel George V|5"
"Paris|Le Meurice|5"
"Paris|Hotel Plaza Athenee|5"
"Paris|Shangri-La Paris|5"
"Nice|Hotel Negresco|5"
"Nice|Anantara Plaza Nice|5"
"Nice|Le Meridien Nice|4"
"Nice|Hotel Aston La Scala|4"
"Nice|Boscolo Nice|5"
"Lyon|InterContinental Lyon - Hotel Dieu|5"
"Lyon|Sofitel Lyon Bellecour|5"
"Lyon|Cour des Loges|5"
"Lyon|Villa Florentine|5"
"Lyon|Mama Shelter Lyon|4"
)

okc=0; okh=0; fail=0
for c in "${CITIES[@]}"; do
  body=$(printf '{"name":"%s","country":"%s","location":"%s"}' "$c" "$COUNTRY" "$COUNTRY")
  code=$(post "$CITIES_EP" "$body")
  [ "$code" = "200" ] && okc=$((okc+1)) || { fail=$((fail+1)); echo "CITY FAIL ($code): $c"; }
done
for row in "${HOTELS[@]}"; do
  IFS='|' read -r city hotel stars <<< "$row"
  body=$(printf '{"name":"%s","stars":%s,"location":"%s, %s"}' "$hotel" "$stars" "$city" "$COUNTRY")
  code=$(post "$HOTELS_EP" "$body")
  [ "$code" = "200" ] && okh=$((okh+1)) || { fail=$((fail+1)); echo "HOTEL FAIL ($code): $hotel"; }
done
echo "---"
echo "Cities created: $okc/3   Hotels created: $okh/15   Failed: $fail"
