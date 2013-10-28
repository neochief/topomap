function redrawLinesAndMarkers(gLatLngArray) {
	drawPolyLine(gLatLngArray);
	drawMarkers(gLatLngArray);
}

var lines = {
	ptHash: {},
	polyLineSegmentsArr: [],
	points: [],

	reDrawMarkers: function() {
		this.clearMarkers();
		if (this.points.length > 0) {
			this.drawStopStartMarker(this.points[0], "start");
			this.drawStopStartMarker(this.points[this.points.length - 1], "stop");

			for (var m = 1; m < this.points.length - 1; m++) {
				var imageUrl;
				var mileNum = m + 1;
				imageUrl = "markers.png";

				var icon = {
					url: imageUrl,
					size: new google.maps.Size(10, 10),
					origin: new google.maps.Point(0, 0),
					anchor: new google.maps.Point(5, 5)
				};

				this.drawMileMarker(this.points[m], icon, m);
			}
		}
	},

	drawStopStartMarker: function(gLatLng, id) {
		this.ptHash[id] = new google.maps.Marker({
			position: gLatLng,
			map: map
		});
	},
	drawMileMarker: function(gLatLng, icon, idx) {
		if (this.ptHash[idx] == undefined) {
			this.ptHash[idx] = new google.maps.Marker({
				position: gLatLng,
				icon: icon,
				map: map
			});
		}
	},
	clearMarkers: function() {
		for (var prop in this.ptHash) {
			if (this.ptHash.hasOwnProperty(prop)) {
				this.ptHash[ prop ].setMap(null);
				delete this.ptHash[ prop ];
			}
		}
	},

	reDrawPath: function() {
		this.clearPolylines();
		this.polyLineSegmentsArr.push(new google.maps.Polyline({
			geodesic: true,
			path: this.points,
			strokeColor: '#FF0000',
			map: map
		}));
	},
	clearPolylines: function() {
		for (var i = this.polyLineSegmentsArr.length - 1; i >= 0; i--) {
			this.polyLineSegmentsArr[ i ].setMap(null);
			this.polyLineSegmentsArr.pop();
		}
	},

	getDistance: function() {
		var distances = [Math.round(google.maps.geometry.spherical.computeLength(this.points))];
		for (var m = 1; m <= this.points.length; m++) {
			distances.push(Math.round(google.maps.geometry.spherical.computeLength(this.points.slice(0, m))));
		}
		return distances;
	}
}
