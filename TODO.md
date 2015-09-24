## TODO

* Store ONLY roads in database [x]
  - Road name according to OSM
  - Road ID -- osm_id
* When request comes in, use lat,lng and make a req to OSM's Nomatim API [x]
  - ex: http://nominatim.openstreetmap.org/reverse?format=json&lon=55.656443&lat=24.195043
  - Lookup road using unique OSM ID: http://nominatim.openstreetmap.org/lookup?format=json&osm_ids=W103242220
* Check if the returned road is in the database [x]
  - Use the unqiue osm_id, as road name MAY change
* Create `accidents` collection
  - location: GeoJSON Point, time: Time
* Create a small web app for inserting/deleting accidents and roads
