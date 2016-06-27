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
			this.drawStartMarker(this.points[0], "start");
			this.drawStopMarker(this.points[this.points.length - 1], "stop");
			for (var m = 1; m < this.points.length - 1; m++) {
				this.drawMileMarker(this.points[m], m);
			}
		}
	},

	drawStartMarker: function(gLatLng, idx) {
		this.drawMarker(gLatLng, idx, {
			url: "marker-start.png",
			size: new google.maps.Size(24, 24),
			origin: new google.maps.Point(0, 0),
			anchor: new google.maps.Point(7, 20)
		})
	},
	drawStopMarker: function(gLatLng, idx) {
		this.drawMarker(gLatLng, idx, {
			url: "marker-finish.png",
			size: new google.maps.Size(24, 24),
			origin: new google.maps.Point(0, 0),
			anchor: new google.maps.Point(7, 20)
		})
	},
	drawMileMarker: function(gLatLng, idx) {
		this.drawMarker(gLatLng, idx, {
			url: "marker-checkpoint.png",
			size: new google.maps.Size(24, 24),
			origin: new google.maps.Point(0, 0),
			anchor: new google.maps.Point(7, 20)
		})
	},
	drawMarker: function(gLatLng, idx, icon) {
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
