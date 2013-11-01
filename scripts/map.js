var map;

function parseHash() {
	var hash = window.location.hash.slice(1);
	var res, lat = 50.428206, lng = 30.555382, z = 10, t = "satellite", points = null;
	if (res = hash.match(/lat=([0-9\.]*)/)) {
		lat = res[1];
	}
	if (res = hash.match(/lon=([0-9\.]*)/)) {
		lng = res[1];
	}
	if (res = hash.match(/z=([0-9\.]*)/)) {
		z = res[1] ? res[1] : 10;
	}
	if (res = hash.match(/t=([a-zA-Z ]*)/)) {
		t = res[1] ? res[1] : 'satellite';
	}

	if (res = hash.match(/gz=([0-9;]*)/)) {
		var mx, my, nx, ny;
		var gz = res[1] ? res[1] : '';
		if (gz) {
			points = [];
			gz = gz.split(';');
			my = parseInt(gz[1]);
			mx = parseInt(gz[2]);
			for (var i = 3; i + 1 < gz.length; i = i + 2) {
				if (gz[i]) {
					ny = my + parseInt(gz[i]);
					nx = mx + parseInt(gz[i + 1]);
					points.push(new google.maps.LatLng(nx / 10000000, ny / 10000000));
				}
			}
		}
	}

	return { "lat": parseFloat(lat), "lng": parseFloat(lng), "zoom": parseInt(z), "type": t, "points": points }
}

$(window).load(function() {
	var hash_data = parseHash();

	map = new google.maps.Map(document.getElementById('map'), {
		"disableDoubleClickZoom": true,
		"zoom": hash_data.zoom,
		"center": new google.maps.LatLng(hash_data.lat, hash_data.lng),
		"mapTypeId": hash_data.type
	});

	var yandexSatType = new google.maps.ImageMapType({
                getTileUrl: function(coord, zoom) {
                        return "http://sat0" + ((coord.x + coord.y) % 5) + ".maps.yandex.net/tiles?l=sat&v=2.16.0&x=" +
                                coord.x + "&y=" + coord.y + "&z=" + zoom + "";
                },
                tileSize: new google.maps.Size(256, 256),
                isPng: true,
                alt: "Yandex Sat",
                name: "Yandex Sat",
                maxZoom: 17
        });
        yandexSatType.projection = new YandexProjection();
	map.mapTypes.set("Yandex Sat", yandexSatType);

	var yandexMapType = new google.maps.ImageMapType({
                getTileUrl: function(coord, zoom) {
                        return "http://vec0" + ((coord.x + coord.y) % 5) + ".maps.yandex.net/tiles?l=map&v=2.16.0&x=" +
                                coord.x + "&y=" + coord.y + "&z=" + zoom + "";
                },
                tileSize: new google.maps.Size(256, 256),
                isPng: true,
                alt: "Yandex Map",
                name: "Yandex Map",
                maxZoom: 17
        });
	yandexMapType.projection = new YandexProjection();
	map.mapTypes.set("Yandex Map", yandexMapType);

	function YandexProjection() {
		this.pixelOrigin_ = new google.maps.Point(128, 128);
		var MERCATOR_RANGE = 256;
		this.pixelsPerLonDegree_ = MERCATOR_RANGE / 360;
		this.pixelsPerLonRadian_ = MERCATOR_RANGE / (2 * Math.PI);

		this.fromLatLngToPoint = function(latLng) {
			function atanh(x) {
				return 0.5 * Math.log((1 + x) / (1 - x));
			}

			function degreesToRadians(deg) {
				return deg * (Math.PI / 180);
			}

			function bound(value, opt_min, opt_max) {
				if (opt_min != null) value = Math.max(value, opt_min);
				if (opt_max != null) value = Math.min(value, opt_max);
				return value;
			}

			var origin = this.pixelOrigin_;
			var exct = 0.0818197;
			var z = Math.sin(latLng.lat() / 180 * Math.PI);
			return new google.maps.Point(origin.x + latLng.lng() * this.pixelsPerLonDegree_,
				Math.abs(origin.y - this.pixelsPerLonRadian_ * (atanh(z) - exct * atanh(exct * z))));
		};

		this.fromPointToLatLng = function(point) {
			var origin = this.pixelOrigin_;
			var lng = (point.x - origin.x) / this.pixelsPerLonDegree_;
			var latRadians = (point.y - origin.y) / -this.pixelsPerLonRadian_;
			var lat = Math.abs((2 * Math.atan(Math.exp(latRadians)) - Math.PI / 2) * 180 / Math.PI);
			var Zu = lat / (180 / Math.PI);
			var Zum1 = Zu + 1;
			var exct = 0.0818197;
			var yy = -Math.abs(((point.y) - 128));
			while (Math.abs(Zum1 - Zu) > 0.0000001) {
				Zum1 = Zu;
				Zu = Math.asin(1 - ((1 + Math.sin(Zum1)) * Math.pow(1 - exct * Math.sin(Zum1), exct))
					/ (Math.exp((2 * yy) / -(256 / (2 * Math.PI))) * Math.pow(1 + exct * Math.sin(Zum1), exct)));
			}
			if (point.y > 256 / 2) {
				lat = -Zu * 180 / Math.PI;
			} else {
				lat = Zu * 180 / Math.PI;
			}
			return new google.maps.LatLng(lat, lng);
		};

		return this;
	}

	map.mapTypes.set("Soviet", new google.maps.ImageMapType({
		getTileUrl: function(coord, zoom) {
			return "http://373.kiev.ua/topomap/Z" + zoom + "/" + coord.y + "/" + coord.x + ".png";
		},
		tileSize: new google.maps.Size(256, 256),
		isPng: true,
		alt: "Soviet",
		name: "Soviet",
		maxZoom: 13
	}));

	map.setOptions({mapTypeControlOptions: {mapTypeIds: [google.maps.MapTypeId.SATELLITE, google.maps.MapTypeId.ROADMAP, "Yandex Sat", "Yandex Map", "Soviet"]} });

	if (hash_data.points) {
		lines.points = hash_data.points;
		redraw();
	}


	navigator.geolocation.getCurrentPosition(function(position) {
		var latitude = position.coords.latitude;
		var longitude = position.coords.longitude;
		var center = new google.maps.LatLng(latitude, longitude);
		new google.maps.Marker({map: map, position: center});
	});


	function update_hash() {
		var fragment;
		var coords = map.getCenter();
		var zoom = map.getZoom();
		var mapType = map.getMapTypeId();
		fragment = 'lat=' + encodeURI(Math.round(coords.lat() * 10000000) / 10000000) + '&lon=' + encodeURI(Math.round(coords.lng() * 10000000) / 10000000) + '&z=' + encodeURI(zoom) + '&t=' + encodeURI(mapType);

		if (lines.points.length > 1) {
			var mx = lines.points[0].lat(), my = lines.points[0].lng();
			for (var m = 1; m < lines.points.length; m++) {
				if (mx > lines.points[m].lat()) {
					mx = lines.points[m].lat();
				}
				if (my > lines.points[m].lng()) {
					my = lines.points[m].lng();
				}
			}
			my = Math.round(my * 10000000);
			mx = Math.round(mx * 10000000);

			var gz = ';gz=0;' + my + ';' + mx;
			for (var m = 0; m < lines.points.length; m++) {
				gz += ';' + (Math.round(lines.points[m].lng() * 10000000) - my) + ';' + (Math.round(lines.points[m].lat() * 10000000) - mx);
			}
			fragment += gz;
		}
		window.location = '#' + fragment;
	}

	google.maps.event.addListener(map, 'dragend', update_hash);
	google.maps.event.addListener(map, 'zoom_changed', update_hash);
	google.maps.event.addListener(map, 'maptypeid_changed', update_hash);


	google.maps.event.addListener(map, "dblclick", function(evt) {
		lines.points.push(evt.latLng);
		update_hash();
		redraw();
	});

	Mousetrap.bind(['command+z', 'ctrl+z'], function(e) {
		lines.points.pop();
		update_hash();
		redraw();
	});
});

function renderDistance(distances) {
	if (distances.length > 1) {
		$('#distances .total').html('Общая дистанция: <b>' + addSpaces(distances[0]) + '&nbsp;м.</b>');
		$('#distances .points').html('');
		for (var m = 1; m < distances.length; m++) {
			$('#distances .points').append('<li>' + addSpaces(distances[m]) + '&nbsp;м.</li>');
		}
		$('#distances').show();
	}
	else {
		$('#distances').hide();
	}
}

function redraw() {
	lines.reDrawMarkers();
	lines.reDrawPath();
	renderDistance(lines.getDistance());
}

function addSpaces(nStr) {
	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ' ' + '$2');
	}
	return x1 + x2;
}
