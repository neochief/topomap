google.maps.event.addDomListener( window, 'load', initializeMap );

var map;
var bikeLayer;
var bDoubleClickHappened = false;
var DEFAULT_LAT = 37.063020;
var DEFAULT_LNG = -95.677013;
var DEFAULT_ZOOM = 2;
var DEFAULT_ELEV_PARAM = "0a";
var IS_LOADING_FROM_QUERYSTRING = true;
var NOT_LOADING_FROM_QUERYSTRING = false;
var IS_CREATING_THERE_AND_BACK = true;
var NOT_CREATING_THERE_AND_BACK = false;
var NO_GRAPH_MESSAGE = '<span style="font-family:arial;font-size:10pt">Elevation only available on routes with two or more points, and in the U.S. You may also see this message when there is a problem with the remote service that provides the elevation data.</span>';
var REFRESH_LINK = '<div style="font-family:arial;font-size:10pt;float:left;width:100px"><a href="javascript:refreshGraph();">Refresh graph</a>: One or more of the elevation lookups returned failure (resulting in a "0" in your graph). Click the link to refresh and try again.</div>';
var elevationArrayIndex = 0;
var currentElevationGraphHeight = '0';
var bAllElevationsWereZero = true;
var shouldPerformElevationLookup = false;
var performElevationLookup = false;
var bAllElevationsFound = false;
var numberOfFoundElevations = 0;
var ElevationsArrLen = 0;
var iPercent = 0;
var bShowRefreshLink = false;
var rId = '';
var suppressSaveModal = false;
var routeSaved = true;
var paramString = location.href;
var routeIdFromQueryString;
var ptHash = new Object();
var routeSegmentsCount = 0;
var polyLineSegmentsArr = new Array();
var currentLine = new Array(0);
var svgCache;
var svgParent;

var LOGINSTATE_UNKNOWN = -1;
var LOGINSTATE_NOT_LOGGEDIN = 0;
var LOGINSTATE_IS_LOGGEDIN = 1;
var isLoggedIn = LOGINSTATE_UNKNOWN;

//following formerly in drawControls.js
var unlinkElevation0 = "off";
var unlinkElevation100 = "small";
var unlinkElevation200 = "large";
var linkElevation0 = "<a href=\"javascript:elevationSwitch('0');\">off</a>";
var linkElevation100 = "<a href=\"javascript:elevationSwitch('100');\">small</a>";
var linkElevation200 = "<a href=\"javascript:elevationSwitch('200');\">large</a>";
var saveLinkActive = '<a href="javascript:createPermalink();">Save route</a>';
var saveLinkInactive = 'Saved';
var saveLinkSaving = 'Saving...';
//var ENVIRONMENT_IDENTIFIER = "frontend_dev.php/";
var ENVIRONMENT_IDENTIFIER = "";

CustomGetTileUrl=function(a,b,c) {
	var lULP = new GPoint(a.x*256,(a.y+1)*256);
	var lLRP = new GPoint((a.x+1)*256,a.y*256);
	var lUL = G_NORMAL_MAP.getProjection().fromPixelToLatLng(lULP,b,c);
	var lLR = G_NORMAL_MAP.getProjection().fromPixelToLatLng(lLRP,b,c);
	var lBbox=lUL.x+","+lUL.y+","+lLR.x+","+lLR.y;
	var lSRS="EPSG:4326";
	var lURL=this.myBaseURL;
	lURL+="&REQUEST=GetMap";
	lURL+="&SERVICE=WMS";
	lURL+="&reaspect=false&VERSION=1.1.1";
	lURL+="&LAYERS="+this.myLayers;
	lURL+="&STYLES=default";
	lURL+="&FORMAT="+this.myFormat;
	lURL+="&BGCOLOR=0xFFFFFF";
	lURL+="&TRANSPARENT=TRUE";
	lURL+="&SRS="+lSRS;
	lURL+="&BBOX="+lBbox;
	lURL+="&WIDTH=256";
	lURL+="&HEIGHT=256";
	lURL+="&GroupName="+this.myLayers;
	return lURL;
}
// var tileDRG= new GTileLayer(new GCopyrightCollection(""),1,17);
// tileDRG.myLayers='DRG';
// tileDRG.myFormat='image/jpeg';
// tileDRG.myBaseURL='http://www.terraserver-usa.com/ogcmap6.ashx?';
// tileDRG.getTileUrl=CustomGetTileUrl;
// var topoLayer=[tileDRG];
// var topoMap = new GMapType(topoLayer, G_SATELLITE_MAP.getProjection(), "Topo", G_SATELLITE_MAP);


// var copyOSM = new GCopyrightCollection("<a href=\"http://www.openstreetmap.org/\">OpenStreetMap</a> data provided by <a href=\"http://www.cloudmade.com/\">Cloudmade</a>");
// copyOSM.addCopyright(new GCopyright(1, new GLatLngBounds(new GLatLng(-90,-180), new GLatLng(90,180)), 0, " "));
// var tilesOsm     = new GTileLayer(copyOSM, 1, 18, {tileUrlTemplate: 'http://tile.cloudmade.com/6dfaf084885456cfb9612333f46d2e0f/1/256/{Z}/{X}/{Y}.png'});
// var mapOsm     = new GMapType([tilesOsm], G_SATELLITE_MAP.getProjection(), "OSM", G_SATELLITE_MAP);

var defaultLocMarker;

loadAds();

$(document).ready( function(){
	//initial load stuff
//		$.get( '/gp/ajaxAuthentication/getHeader', function( data ) {
//		  	$( '#header' ).prepend( data );
//
//			resetHeight();
//		});
	setEditableFields();

	getHeader();

	showAnnouncementModal();

	addTweetButton();

	if ( typeof( FB ) != "undefined" )
	{
		FB.init({appId: "257979067587488", status: true, cookie: true});
	}

	$( '#recordFromDefaultLoc' ).click( startRecordingFromDefaultLoc )
	$( '#recordFromOtherLoc' ).click( startRecordingFromOtherLoc )

	$( '#startRecording' ).click( startRecordingFromOtherLoc );

});

function startRecordingFromOtherLoc()
{
	//this little boolean is what actually controls whether or not recording is happening...
	bRecordPoints = true;

	//this function is called in default-location-havin' mode, but also in nada-default-location-havin' mode.
	if ( defaultLocMarker.getMap() != null )
	{
		defaultLocMarker.setMap( null );

		$( '#recordFromDefaultLoc' ).val( 'Recording...' );
		$( '#recordFromOtherLoc' ).val( 'Recording...' );
	}
	else
	{
		$( '#startRecording' ).val( 'Recording...' );
	}


}
function startRecordingFromDefaultLoc()
{
	//only do this if not already recording points.
	if ( ! bRecordPoints )
	{
		var defaultLoc = defaultLocMarker.getPosition();

		//don't need defaultLoc marker anymore
		defaultLocMarker.setMap( null );

		//this little boolean is what actually controls whether or not recording is happening...
		bRecordPoints = true;

		//unlike normal start recording button press, we also set the first point...
		// var defaultLoc = defaultLocMarker.getLatLng();
		addLeg( defaultLoc.lng(), defaultLoc.lat(), NOT_LOADING_FROM_QUERYSTRING, NOT_CREATING_THERE_AND_BACK );

		redrawLinesAndMarkers( gLatLngArray );

	}

	$( '#recordFromDefaultLoc' ).val( 'Recording...' );
	$( '#recordFromOtherLoc' ).val( 'Recording...' );
}

$( window ).resize( resetHeight );

function showAnnouncementModal()
{
	var curDate = new Date();
	//don't forget javascript's stupid 0-based months...
	var isDateBeforeCutoff = ( curDate.getMonth() == 0 && curDate.getFullYear() == 2012  && curDate.getDate() <= 9 );

	if ( ( getCookie( 'campaignAnnouncementShown' ) != "true" ) && isDateBeforeCutoff )
	{
		$.fn.colorbox( {
			href:"/annoucement.htm",
			overlayClose:true,
			width:"80%",
			height:"80%",
			iframe:true,
			open:true
		} );
	}
	setCookie( 'campaignAnnouncementShown', 'true', 30 );
}

function setEditableFields(){

//		$( 'div.editable' ).editable(  );

	//editable name and description fields
//		$( '#nameData, #descriptionData' ).editable( { onSubmit:handleSubmit,onEdit:handleEdit } );
//
//		$( '#nameEditTip' ).click( function(){ $( '#nameData' ).click(); } );
//		$( '#descriptionEditTip' ).click( function(){ $( '#descriptionData' ).click(); } );
//
//		$( '.editable, .editTip' ).hover(
//			function () {
//				$(this).addClass( 'editHighlight' );
//			},
//			function () {
//				$(this).removeClass( 'editHighlight' );
//			}
//		);
	$( '.nameDescriptionData' ).click( nameDescriptionEditor );
	$( '.nameDescriptionData' ).hover(
		function () {
			$(this).addClass( 'editHighlight' );
		},
		function () {
			$(this).removeClass( 'editHighlight' );
		}
	)

	$( '.nameDescriptionInput' ).dblclick( finishEditor );
	$( '.nameDescriptionInput' ).blur( finishEditor );
	$( '.nameDescriptionInput' ).keypress( captureEnter );
}
function captureEnter( thisEvent )
{
	if ( thisEvent.keyCode == 13 )
	{
		finishEditor( thisEvent );
	}
}
function finishEditor( thisEvent )
{
	var inputObj = $( thisEvent.currentTarget );
	var resetVal;
	if ( inputObj.val() == '' )
	{
		resetVal = "[Click to enter text]"
	}
	else
	{
		resetVal = inputObj.val();
	}
	inputObj.prev().html( resetVal );
	inputObj.hide();
	inputObj.prev().show();
}
function nameDescriptionEditor()
{
	//this refers to the nameDescriptionData field
	$( this ).hide();
	if ( $( this).html() == "[Click to enter text]" )
	{
		//this is happening because IE was prefilling hidden fields with values from before reload. feh.
		$( this ).next().val( "" );
	}
	else
	{
		$( this ).next().val( $( this ).html() );
	}
	$( this ).next().show();
}
function getHeader()
{
	//initial load stuff
	$.get( '/gp/ajaxAuthentication/getHeader', function( data ) {
		if ( $( '#leftCol' ).length != 0 )
		{
			$( '#leftCol' ).remove();
		}
		$( '#header' ).prepend( data );

		resetHeight();
	});
}
//	function handleEdit( content )
//	{
//		$(this).next().html( '' );
//		$(this).css( 'width', '175px' )
//	}
//	function setHintState( fieldData, dataNode )
//	{
//		if ( fieldData.length > 0 )
//		{
//			dataNode.next().html( '' );
//
//			dataNode.next().width( 0 );
//			dataNode.width( 175 );
//			//dataNode.css( 'height', '100%' );
//		}
//		else
//		{
//			dataNode.next().html( '[Click to enter text]' );
//
//			dataNode.next().width( 175 );
//			dataNode.width( 0 );
//			//dataNode.css( 'height', '100%' );
//			//dataNode.next().html( '[Click to enter text]' );
//		}
//	}
//	function handleSubmit( content )
//	{
//		setHintState( content.current, $(this) );
//		//$(this).css( 'float', 'left' )
//	}
function resetHeight()
{
	//in despair, I've given up on a pure CSS way of making the map expand vertically to take up the screen...
	//185 px represents 20 px for the top header and 165px for the ads at bottom
	var pageHeight = $( 'body' ).height();
	var topElementsHeight = $( '#topElements' ).height();
	$( '#mapPane' ).height( pageHeight - 90 - topElementsHeight );

	//for some unknown reason, an 8px offest was appearing on the left side.
	//if I tried to reset it through css, the map broke entirely. so weird.
	//anyway, this seems to correct it
	$( 'body' ).css( 'margin-left', '0px' );
}
function initializeMap(){

	//route may come entirely from querystring or be saved serverside
	routeIdFromQueryString = getQuerystringParameter('r', paramString);

	if (routeIdFromQueryString.length > 0) {

		var mapDiv = document.getElementById("map");
		mapDiv.style.fontFamily = "arial";
		mapDiv.style.fontSize = "24pt";
		mapDiv.innerHTML = 'looking up route ' + routeIdFromQueryString + '...';

		//drawMap() and rehydrateMapFromUrl() get called internally by getRoute
		rId =  routeIdFromQueryString;
		getRoute(routeIdFromQueryString);

	} else {

		drawMap();
		//if parameters have been passed in to prepop location and route, parse them and display correct values
		rehydrateMapFromUrl();

	}
	drawAutosaveMessage();
	setLoginState();
}
function setLoginState(){

	$.ajax({
		url: "/gp/" + ENVIRONMENT_IDENTIFIER + "ajaxAuthentication/isAuthenticated",
		cache: false
	}).done(function( html ) {
			//isAuthenticated should give back 0 or 1 -- these match the values of LOGINSTATE_IS_LOGGEDIN and LOGINSTATE_NOT_LOGGEDIN
			//parseInt becase annoying symfony sticks two hard returns on the end of the output
			isLoggedIn = parseInt( html );
		});

}
function drawMap(){

	//============================================================================================================
	// ==== GANK REF ====
	// totally ripped off this function from http://viewer.nationalmap.gov/example/maps/googleTnm.html
	//============================================================================================================
	var TileMap = function(baseUrl, name, options) {
		// Normalizes the coords that tiles repeat across the x axis (horizontally)
		// like the standard Google map tiles.
		var getNormalizedCoord = function(coord, zoom) {
			var y = coord.y;
			var x = coord.x;

			// tile range in one direction range is dependent on zoom level
			// 0 = 1 tile, 1 = 2 tiles, 2 = 4 tiles, 3 = 8 tiles, etc
			var tileRange = 1 << zoom;

			// don't repeat across y-axis (vertically)
			if (y < 0 || y >= tileRange) {
				return null;
			}

			// repeat across x-axis
			if (x < 0 || x >= tileRange) {
				x = (x % tileRange + tileRange) % tileRange;
			}

			return {
				x: x,
				y: y
			};
		};

		var tileMap = {};

		tileMap.getTileUrl = function(coord, zoom) {
			var returnValue = "";
			var normalizedCoord = getNormalizedCoord(coord, zoom);
			if (!normalizedCoord) {
				return null;
			}
			var bound = Math.pow(2, zoom);
			newUrl = baseUrl.replace("{z}", zoom);
			newUrl = newUrl.replace("{x}", normalizedCoord.x);
			newUrl = newUrl.replace("{y}", normalizedCoord.y);
			return newUrl;
		};

		tileMap.tileSize= new google.maps.Size(256, 256);
		tileMap.maxZoom= 19;
		tileMap.minZoom= 0;
		tileMap.name= name ? name : ["New Base Map"];

		// Take the options parameter and overwrite stuff
		for (var option in options) {
			if (options.hasOwnProperty(option)) {
				tileMap[option] = options[option];
			}
		}

		return new google.maps.ImageMapType(tileMap);
	};

	map = new google.maps.Map(document.getElementById("map"), {
		center: new google.maps.LatLng(DEFAULT_LAT, DEFAULT_LNG),
		zoom: DEFAULT_ZOOM,
		mapTypeId: google.maps.MapTypeId.ROADMAP,
		draggableCursor: 'crosshair',
		draggingCursor: 'crosshair',
		scaleControl: true,
		disableDoubleClickZoom: true,
		scrollwheel: true,
		tilt: 0,
		zoomControl: true,
		zoomControlOptions: {
			position: google.maps.ControlPosition.RIGHT_TOP,
			style: google.maps.ZoomControlStyle.LARGE
		},
		mapTypeControlOptions: {
			mapTypeIds: [
				google.maps.MapTypeId.ROADMAP,
				google.maps.MapTypeId.SATELLITE,
				google.maps.MapTypeId.HYBRID,
				google.maps.MapTypeId.TERRAIN,
				"OSM",
				"OpenCycle",
				"USGS",
				"USGSoldskool"
			],
			style: google.maps.MapTypeControlStyle.DROPDOWN
		}
	});

	map.mapTypes.set("OSM", new google.maps.ImageMapType({
		getTileUrl: function(coord, zoom) {
			return "http://tile.openstreetmap.org/" + zoom + "/" + coord.x + "/" + coord.y + ".png";
		},
		tileSize: new google.maps.Size(256, 256),
		name: "OSM",
		maxZoom: 18
	}));

	map.mapTypes.set("OpenCycle", new google.maps.ImageMapType({
		getTileUrl: function(coord, zoom) {
			return "http://tile.opencyclemap.org/cycle/" + zoom + "/" + coord.x + "/" + coord.y + ".png"
		},
		tileSize: new google.maps.Size(256, 256),
		name: "OpenCycle",
		maxZoom: 18
	}));

	var usgs = TileMap(
		"http://navigator.er.usgs.gov/tiles/tcr.cgi/{z}/{x}/{y}",
		"USGS"
	);
	map.mapTypes.set( "USGS", usgs );

	var usgs_oldskool = TileMap(
		"http://services.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer/tile/{z}/{y}/{x}",
		"USGS Oldskool",
		{ maxZoom: 15 }
	);
	map.mapTypes.set( "USGSoldskool", usgs_oldskool );


	// });

	// map.addMapType(topoMap);
	// map.addMapType( mapOsm )

	// map.addControl(new GScaleControl());


	//set default value...
	//document.getElementById("elevationChart").innerHTML = NO_GRAPH_MESSAGE;

	//mapHeight and adMargin are set in index.html, since map doesn't render properly unless the map div has correct pixel dimensions.
	//document.getElementById('map').style.height = mapHeight+'px';
	//document.getElementById('adDiv').style.marginTop = adMargin+'px';

	//upon move we need to redraw since we have optimized so that only
	//the current viewport's markers and line sections are shown
	google.maps.event.addListener(map, "move", function()
	{
		redrawLinesAndMarkers(gLatLngArray);
	});

	//doubleclick is the meat in this website's sammich. add a point and redraw
	google.maps.event.addListener(map, "dblclick", function( evt )
	{
		// var curCenter = map.getCenter();
		map.panTo( evt.latLng );
		addLeg( evt.latLng.lng(), evt.latLng.lat(), NOT_LOADING_FROM_QUERYSTRING, NOT_CREATING_THERE_AND_BACK);
		clearAutoSaveMessage();

		redrawLinesAndMarkers( gLatLngArray );
	});

	//if a zoom happens, we may need to create or destroy the markerArray since
	//some zoom levels show markers and others don't
	google.maps.event.addListener(map, "zoomend", function(oldZoom, newZoom)
	{
		prepMarkerArray();

		redrawLinesAndMarkers(gLatLngArray);
	});
}
function redrawLinesAndMarkers(gLatLngArray)
{
	drawPolyLine(gLatLngArray);
	drawMarkers(gLatLngArray);
}

var pointTypeArray = new Array(0);
var xArray = new Array(0);
var yArray = new Array(0);
var gLatLngArray = new Array(0);
var elevationArray = new Array(0);
var legArray = new Array(0);
var distancesArray = new Array(0);
var mileMarkersToDraw = new Array(0);
var routePolyline;
var distance = 0;
var bRecordPoints = false;
var REMOVE = 0;
var ADD = 1;
var ENGLISH = 		"0";
var METRIC = 		"1";
var DISTANCE = 		"2";
var SMALLDISTANCE =	"3";
var WEIGHT = 		"4";
var SHOW = 			"5";
var HIDE = 			"6";
var LEFT = 			"7";
var RIGHT = 		"8";
//used as indexes of a hash for the stop and start markers. make sure they remain strings so as not to collide with numeric indexes used for mile markers
var START = 		"start";
var STOP = 			"stop";
var CLICKED_POINT 	= "0";
var GEOCODED_POINT 	= "1";
var DRAW_RUNNING = "0";
var DRAW_BIKING = "1";
var DRAW_MANUAL = "2";
var ELEVATION_UNLOOKEDUP = null;
var ELEVATION_LOOKEDUP_NOT_YET_RETURNED = -1;

var currentWeightUnits = getCurrentUnits();
var bIsIE;
var showMarkers = true;

distancesArray.push(0);

//	if (navigator.appName == 'Microsoft Internet Explorer'){
//
//		document.ondblclick = handleDblClick;
//		bIsIE = true;
//
//	} else {
//
//		window.ondblclick = function(){alert('doubleclick!');bDoubleClickHappened = true;}
//		bIsIE = false;
//
//	}
//
//	function handleDblClick() {
//
//		bDoubleClickHappened = true;
//
//	}

window.onunload = saveUnsavedChanges;

function addLeg(xCoord, yCoord, isLoadFromQueryString, isCreatingThereAndBack) {

	if (bRecordPoints) {

		if (shouldUseDirectionsForDrawingLeg( isLoadFromQueryString, isCreatingThereAndBack, xArray.length )){

			addLegsFromDirectionsObject(xCoord, yCoord, isLoadFromQueryString, isCreatingThereAndBack)

		} else {

			addSingleLeg(xCoord, yCoord, isLoadFromQueryString, isCreatingThereAndBack);

			//if we are adding from thereAndBack or loading from querystring, calling
			//function will take care of adding
			if ( (!isCreatingThereAndBack) && (!isLoadFromQueryString) ) {

				pointTypeArray.push( CLICKED_POINT );

			}

		}

		//drawPolyLine(gLatLngArray);
		drawMarkers(gLatLngArray);
		//bDoubleClickHappened = false;

	}

}
function addLegsFromDirectionsObject( lng, lat, isLoadFromQueryString, isCreatingThereAndBack){

	lastPoint = gLatLngArray[gLatLngArray.length-1];

	var waypointArray = formatLatLngForDirections(gLatLngArray[gLatLngArray.length-1], new google.maps.LatLng( lat, lng ))

	var routeType = ( getRouteDrawMode() == DRAW_RUNNING )? google.maps.TravelMode.WALKING : google.maps.TravelMode.BICYCLING ;

	var directionsRequest = {

		origin: new google.maps.LatLng( lastPoint.lat(), lastPoint.lng() ),
		destination: new google.maps.LatLng( lat, lng ),
		travelMode: routeType

	};

	var directionsService = new google.maps.DirectionsService();
	directionsService.route(directionsRequest, function(directionResult, status) {
		if (status == google.maps.DirectionsStatus.OK) {

			var myRoute = directionResult.routes[0].overview_path;

			//starting at 2 since first point will be same as last point of previous leg
			for( var i = 1; i < myRoute.length; i++ ){

				addSingleLeg(
					myRoute[ i ].lng(),
					myRoute[ i ].lat(),
					isLoadFromQueryString,
					isCreatingThereAndBack
				)

				//pointTypeArray is used to keep track of which points were
				//created by directions object, so we can skip back to last
				//clicked point if user chooses to undo a point
				if ( i == myRoute.length - 1 ){

					pointTypeArray.push( CLICKED_POINT );

				} else {

					pointTypeArray.push( GEOCODED_POINT );

				}

			}

			drawPolyLine(gLatLngArray);
			drawMarkers(gLatLngArray);

		}
	});

}
function formatLatLngForDirections( fromPt, toPt){
	var retArr = new Array(
		fromPt.lat() + ', ' + fromPt.lng(),
		toPt.lat() + ', ' + toPt.lng()
	);
	return retArr;
}
function addSingleLeg(xCoord, yCoord, isLoadFromQueryString, isCreatingThereAndBack){

	xArray.push(xCoord);
	yArray.push(yCoord);
	gLatLngArray.push(new google.maps.LatLng(yCoord, xCoord));
	elevationArray.push(ELEVATION_UNLOOKEDUP);
	ElevationsArrLen = elevationArray.length;

	//distancesArray is added in UpdateDistances.
	//getElevation depends on this, so make sure not
	//to change the order of these calls.
	updateDistances(xArray, yArray, ADD);

	drawElevationGraphIfApplicable(isLoadFromQueryString, isCreatingThereAndBack);

	prepMarkersForLeg(distancesArray.length);

	markRouteAsUnsaved();

}
function drawElevationGraphIfApplicable(isLoadFromQueryString, isCreatingThereAndBack){
	//if we're loading from the querystring, don't get all elevation points,
	//as this takes an excessively long time to load. Elevations will be
	//loaded when user chooses to view the graph, at which point we can
	//throw a message warning it will take a long time.
	if (isLoadFromQueryString == NOT_LOADING_FROM_QUERYSTRING) {

		//only do lookup if we're NOT calling from the "back" part of a there and back --
		//if we are, we'll just add the elevation from the correspoding
		//"there" part and save the AJAX overhead
		if (isCreatingThereAndBack == NOT_CREATING_THERE_AND_BACK) {

			if (currentElevationGraphHeight > 0) {

				getElevationsAndDrawGraph()

			}

		}

	}

}
function getBearing(){

	var lat1 = yArray[yArray.length-2];
	var lat2 = yArray[yArray.length-1];
	var lon1 = xArray[xArray.length-2];
	var lon2 = xArray[xArray.length-1];

	return (Math.atan2(Math.sin(lon2-lon1)*Math.cos(lat2), Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(lon2-lon1))) % (2 * Math.PI);

}
//loops through distancesArry and calls prepMarkersForLeg for each
//element in the array. Really it's prepMarkersForLeg does all the interesting stuff,
//but the loop through distancesarray isn't within prepMarkersForLeg, to save
//the effort of looping through all distances for addLeg. In addLeg we instead perform
//prepMarkersForLeg only for the newest leg. But prepMarkersArray is called from everywhere else,
//including removeLeg.
function prepMarkerArray(){

	//must be called BEFORE prepMarkerArray, to make sure that we
	//clear previously existing markers.
	removeAllMileMarkers();

	mileMarkersToDraw = new Array(0);

	//there's some stupid bug causing an extra element with value 0 at the top of distancesArry, fix that some day...
	for (var k=3;k<=distancesArray.length;k++){

		prepMarkersForLeg(k);

	}

}
//Looks in the distancesArray at the index submitted and checks to see if the
//we have passed a unit marker, so that a new marker should be laid down. If so,
//calls calcMarkerLatLng
function prepMarkersForLeg(distanceIdx){

	//if zoomlevel is too high, this feature will probably cause the browser to crash
	// if (map.getZoom() > 11) {

	var firstDistance;
	var secondDistance = returnDistanceInChosenUnits(distancesArray[distanceIdx-1]);

	if (distancesArray.length < 1) {

		firstDistance = 0;

	} else {

		firstDistance = returnDistanceInChosenUnits(distancesArray[distanceIdx-2]);

	}

	var firstFloor = Math.floor(firstDistance);
	var secondFloor = Math.floor(secondDistance);

	if (firstFloor < secondFloor){

		for (var i=firstFloor+1;i<=secondFloor;i++){

			calcMarkerLatLng(parseFloat(i)-firstDistance, distanceIdx-1);

		}

	}

	// }

}
function getSlopeOfLeg(gLatLngArray, idx){

	var lastPoint = gLatLngArray[idx-1];
	var secondToLastPoint = gLatLngArray[idx-2];
	var denominator;

	//little hack to take care of divide by 0 error that can occur when
	//a user chooses a second point exactly north or south of previous point.
	if (secondToLastPoint.lng() == lastPoint.lng()){

		denominator = .00000001

	} else {

		denominator = secondToLastPoint.lng() - lastPoint.lng()
	}

	return ((secondToLastPoint.lat() - lastPoint.lat()) / (denominator));

}
function getLatLngDistanceOfLeg(idx){

	var startPt = idx-2;
	var endPt = idx-1;

	return Math.sqrt(Math.pow(gLatLngArray[startPt].lng()-gLatLngArray[endPt].lng(),2) + Math.pow(gLatLngArray[startPt].lat()-gLatLngArray[endPt].lat(),2))

}
//calculates the position of a mile marker given a geographical position (represented by
//the index of a point in the GLatLng array) and the total distance along the route at which the
//point should be drawn. this is done by figuring out the slope and distance from the last point.
function calcMarkerLatLng(distance, idx){

	var currentDistPercentOfLastLeg = distance/returnDistanceInChosenUnits(legArray[idx-1]);
	var distanceOfLastLegInLatLng = getLatLngDistanceOfLeg(idx);
	var curDistanceLatLng = currentDistPercentOfLastLeg * distanceOfLastLegInLatLng

	var lon1 = gLatLngArray[idx-2].lng();
	var lat1 = gLatLngArray[idx-2].lat();
	var slope = getSlopeOfLeg(gLatLngArray, idx);

	var deltaLon = curDistanceLatLng * (1/(Math.sqrt(1 + Math.pow(slope,2))));
	var deltaLat = curDistanceLatLng * (slope/((Math.sqrt(1 + Math.pow(slope,2)))));

	var lastPointX = parseFloat(gLatLngArray[idx-1].lng());
	var secondToLastPointX = parseFloat(gLatLngArray[idx-2].lng());

	if (secondToLastPointX > lastPointX) {

		deltaLon = -deltaLon;
		deltaLat = -deltaLat;

	}

	var lon2 = parseFloat(lon1)+parseFloat(deltaLon);
	var lat2 = parseFloat(lat1)+parseFloat(deltaLat);
	mileMarkersToDraw.push(new google.maps.LatLng(lat2, lon2));

}
function updateDistances(xArray, yArray, addOrRemove){

	if (addOrRemove == ADD){
		//if (distanceToRemove == 0) {

		fLastLeg = getLastLegDistance(xArray, yArray);

		distancesArray.push(distancesArray[distancesArray.length-1]+fLastLeg)

		//distance += fLastLeg;
		legArray.push(fLastLeg);

		//} else if (distanceToRemove > 0) {
	} else if (addOrRemove == REMOVE) {

		//distance -= removedLeg;
		distancesArray.pop();
		legArray.pop();

	}

	updateDistanceBoxes();

}
function handleWeightChange(){

	var distanceInMiles = distancesArray[distancesArray.length-1];

	currentWeightUnits = getCurrentUnits();
	updateCalorieCounter(distanceInMiles);

}

function updateCalorieCounter(distanceInMiles){

	var rawWeightVal = document.controlPanel.weight.value;

	if (!isNaN(rawWeightVal)){

		var weightInKg;

		if (getCurrentUnits() == METRIC) {

			weightInKg = parseFloat(rawWeightVal);

		} else {

			weightInKg = parseFloat(rawWeightVal) * .45359237;

		}

		var distanceInKm = parseFloat(distanceInMiles) * 1.609345;
		document.controlPanel.calories.value = distanceInKm * weightInKg * 1.036;

	}

}
function updateDistanceBoxes() {

	$( '#mileage' ).html( parseInt(returnDistanceInChosenUnits(distancesArray[distancesArray.length-1])*10000)/10000 );
	//document.controlPanel.mileage.value=parseInt(returnDistanceInChosenUnits(distancesArray[distancesArray.length-1])*10000)/10000;

	updateCalorieCounter(distancesArray[distancesArray.length-1]);

	//var fLastLeg = 0;
	//
	//if (legArray.length > 0) {
	//
	//	fLastLeg = legArray[legArray.length-1];
	//
	//}
	//
	//document.controlPanel.lastLeg.value=parseInt(returnDistanceInChosenUnits(fLastLeg)*10000)/10000;

}
//function returnDistanceInMiles(point1y, point1x, point2y, point2x) {
//
//	var fDistance
//
//	//some users were getting routes with duplicate points somehow. In some cases that seems to come back from
//	//this function OK, but in others it resulted in NaN. Adding an extra little check to just return 0 in that case.
//	if ((point1y == point2y) &&  (point1x == point2x)) {
//
//		distance = 0;
//
//	} else {
//
//		distance = (3963.0 * Math.acos(Math.sin(point1y/57.2958) * Math.sin(point2y/57.2958) + Math.cos(point1y/57.2958) * Math.cos(point2y/57.2958) *  Math.cos((point2x/57.2958) - (point1x/57.2958))));
//
//	}
//
//	return distance;
//
//}
function returnDistanceInMiles(point1y, point1x, point2y, point2x) {

	var point1 = new google.maps.LatLng(point1y, point1x);
	var point2 = new google.maps.LatLng(point2y, point2x);
	var result = google.maps.geometry.spherical.computeDistanceBetween( point1, point2 ) * .000621371192;
	// var result = point1.distanceFrom(point2) * .000621371192;

	return (result);

}
function initializeQuerystringParameter(nameOfParameter, defaultValue){

	var returnVal = '';
	var qstringVal = getQuerystringParameter(nameOfParameter, paramString);

	if (qstringVal.length > 0) {

		returnVal = qstringVal;

	} else {

		returnVal = defaultValue;

	}

	return returnVal;

}
function completeThereAndBackCourse(){

	var mid = gLatLngArray.length - 1;

	if (gLatLngArray.length > 1) {

		//skipping first element, that's the midpoint of the course
		for (var i= mid-1; i >= 0; i--) {

			bAllElevationsFound = false;

			//alert(i);
			//alert(pointsSoFar.length);
			addLeg(gLatLngArray[i].lng(), gLatLngArray[i].lat(), NOT_LOADING_FROM_QUERYSTRING, IS_CREATING_THERE_AND_BACK);

			numberOfFoundElevations++;
			addElevationValueToArray(elevationArray[i],elevationArray.length-1)

			//pointTypeArray is pushed here, since addLeg won't know which point we're mirroring back on
			pointTypeArray.push( pointTypeArray[i] )

		}

		bAllElevationsFound = true;

		//drawElevationGraph normally called within addElevation, but we want to
		//do so once at the end rather than each time we add a point
		drawElevationGraph();

		drawPolyLine(gLatLngArray);
		drawMarkers(gLatLngArray);

	}

}
function rehydrateMapFromUrl() {

	//get units,map type, and calorie counter options
	var featureList = getQuerystringParameter('fl', paramString);

	if (featureList.length > 0) {

		var featureListArr = featureList.split('-');

		var mapType = featureListArr[0];
		var englishOrMetric = featureListArr[1];
		var calorieCounterShowing = featureListArr[2];
		var weight = featureListArr[3];
		var markers = featureListArr[4];

		if (mapType=='s') {

			map.setMapTypeId( google.maps.MapTypeId.SATELLITE );

		} else if (mapType=='m') {

			map.setMapTypeId( google.maps.MapTypeId.ROADMAP );

		} else if (mapType=='h') {

			map.setMapTypeId( google.maps.MapTypeId.HYBRID );

		} else if ( mapType=='p' ) {

			map.setMapTypeId( google.maps.MapTypeId.TERRAIN );

		} else if (mapType == 'o') {

			map.setMapTypeId( "OSM" );

		} else if (mapType == 'c') {

			map.setMapTypeId( "OpenCycle" );

		} else if ( mapType == "k" ){

			map.setMapTypeId( "USGSoldskool" );

		} else if ( mapType == "t" ){

			map.setMapTypeId( "USGS" );

		}

		(englishOrMetric=='m') ? setUnits(METRIC) : setUnits(ENGLISH);

		(calorieCounterShowing =='s') ? toggleCalorieCounter(SHOW) : toggleCalorieCounter(HIDE)

		document.controlPanel.weight.value = unescape(weight);
		currentWeightUnits = getCurrentUnits();

		(markers=='0') ? toggleMarkers(HIDE) : toggleMarkers(SHOW);

	}

	//name and description fields...
	var routeName = getQuerystringParameter('name', paramString);
	if ( unescape( routeName ) != '' )
	{
		$( '#nameData' ).html( unescape( routeName ) ) ;
	}

	var routeDescription = getQuerystringParameter('description', paramString);
	//$( '#descriptionData' ).html( unescape( routeDescription ) );
	if ( unescape( routeDescription ) != '' )
	{
		$( '#descriptionData' ).html( unescape( routeDescription ) ) ;
	}


	var showNameDescription = getQuerystringParameter('show_name_description', paramString);
	//rows are hidden by default, only make call if they need to show
	if (showNameDescription =='t') toggleNameDescription(SHOW);

	//recenter and zoom...
	var curCenterX = parseFloat(initializeQuerystringParameter('centerX', DEFAULT_LNG));
	var curCenterY = parseFloat(initializeQuerystringParameter('centerY', DEFAULT_LAT));

	//code here is in effect overriding what happens in drawmap, since
	//initializeQuerystringParameter ensures that a value is always returned
	var rawZlFromQuerystring = getQuerystringParameter('zl', paramString)
	var zoomLevel;

	//an actual zoomlevel was passed in querystring, check the zv parameter to see
	//whether is was a pre- or post-api v2 zoomlevel
	if (rawZlFromQuerystring.length != 0) {

		var zoomVersion = getQuerystringParameter('zv', paramString);
		zoomLevel = parseInt(initializeQuerystringParameter('zl',DEFAULT_ZOOM));

		//for now, presence of zoomversion can only mean version 2
		if (zoomVersion.length == 0){

			zoomLevel = 17 - zoomLevel;

		}

	} else {

		zoomLevel = DEFAULT_ZOOM;

	}


	map.setCenter( new google.maps.LatLng(curCenterY, curCenterX) );
	map.setZoom( zoomLevel )

	//Note this code MUST come before polyline -- we need to know status of pointTypeArray
	//data before adding legs
	var rdm = initializeQuerystringParameter('rdm', DRAW_RUNNING )
	setRouteDrawMode( rdm );

	var ptaString = getQuerystringParameter( 'pta', paramString )

	if ( ptaString.length > 0 ) {

		var rehydratedPointTypeArray = ptaString.split( "," );

	}

	//redraw polyline
	var polyline = getQuerystringParameter('polyline', paramString);

	if (polyline.length > 0) {

		arrPoints = decodePolyline(polyline);

		//currently the only way it is possible for the URL to have a polyline is if the user was
		//recording at the time they permalinked. Thus, we set recording mode back on now.
		bRecordPoints = true;
		document.controlPanel.startRecording.value='Recording...';

		var j = 0;
		while(j < arrPoints.length) {

			if (rId.length == 0) {

				var yCoord = contractNumber(arrPoints[j++]);
				var xCoord = contractNumber(arrPoints[j++]);

			} else {

				var yCoord = arrPoints[j++];
				var xCoord = arrPoints[j++];

			}

			addLeg(xCoord, yCoord, IS_LOADING_FROM_QUERYSTRING, NOT_CREATING_THERE_AND_BACK);

			if ( ptaString.length > 0 ) {

				//NOTE that j here is actually double the number of whatever point we're adding
				//since arrPoints is a single array of all xCoords AND yCoords
				pointTypeArray.push( rehydratedPointTypeArray[(j/2)-1] );

			} else {

				//if no points came from the array, this is a route that predates the
				//directions types, so all points were clicked points.
				pointTypeArray.push( CLICKED_POINT );

			}

		}

		//addleg sets route to be unsaved, mark it as saved in case of new route
		if (rId.length != 0) {

			//set rId to null -- if a new change is made, we want to create a new route rather than slam the existing one.
			//UPDATE: as of integration with symfony, it is possible to save changes
			//on an existing route on a subsequent visit. Disabling this line.
			//rId = '';

			//route is one saved from an old permalink or tinyurl -- mark it unsaved to remind the user to save it serverside
			if (routeIdFromQueryString.length == 0) {

				markRouteAsUnsaved();

				//route is a serverside route, mark as saved already
			}else{

				markRouteAsSaved();

			}

		}

		addTweetButton( rId );

		//route will have been set to unsaved by addleg calls, reset it here
		//routeSaved = true;

		//gLatLngArray should have been fully repopulated during
		//recursive calls to addLeg
		drawPolyLine(gLatLngArray);
		drawMarkers(gLatLngArray);

		//elevation paramter contains both chosen height of graph and the elevations
		var elevParameter = initializeQuerystringParameter('elev', DEFAULT_ELEV_PARAM);

		if (elevParameter != DEFAULT_ELEV_PARAM) {

			var elevParamArr = elevParameter.split('a');

			var ElevGraphHeightFromUrl = elevParamArr[0];
			//performElevationLookup = (elevParamArr[1]=='1');

			var rawElevArrFromUrl = elevParamArr[2].split('b');

			for (var i = 0; i<rawElevArrFromUrl.length;i++){

				bAllElevationsFound = false;

				//this code now understand an elevation never looked up before as a null
				//legacy route strings will have used a 0 for these, so they are converted
				//into nulls here
				if (rawElevArrFromUrl[i] == "0"){

					addElevationValueToArray(ELEVATION_UNLOOKEDUP, i)

				} else {

					addElevationValueToArray(rawElevArrFromUrl[i]/100, i)

				}

			}
			bAllElevationsFound = true;

			//drawElevationGraph normally called within addElevation, but we want to
			//do so once at the end rather than each time we add a point
			drawElevationGraph();

			elevationSwitch(ElevGraphHeightFromUrl);

			//}

		}

	}

	if ( ( getQuerystringParameter( "centerX", paramString ) == "" ) && ( getQuerystringParameter( "centerY", paramString ) == "" ) )
	{
		getDefaultLoc();
	}

}
function getDefaultLoc()
{
	$.ajax({
		url: '/gp/' + ENVIRONMENT_IDENTIFIER + 'ajaxAuthentication/getDefaultLocation',
		dataType: "json",
		type: 'POST',
		success: function( myData )
		{
			var locData = $.parseJSON(myData);

			if( locData.loggedin == "true" ){

				var fltLat = parseFloat( locData.lat );
				var fltLng = parseFloat( locData.lng );
				var intZoom = parseFloat( locData.zoom );

				if ( (fltLat + fltLng + intZoom ) != 0 )
				{
					var pnt = new google.maps.LatLng( fltLat, fltLng );
					defaultLocMarker = new google.maps.Marker({
						position: pnt,
						map: map
					});

					// map.addOverlay( defaultLocMarker );
					map.setZoom( intZoom );
					map.setCenter( pnt );

					$( '#noDefaultLocButtons' ).hide();
					$( '#hasDefaultLocButtons' ).show();
				}

			}

		}

	});

}
function charFill(string, length, charToFillWith, leftOrRight){

	var initStringLength = string.length;

	for (k=0; k<(length-initStringLength); k++){

		if (leftOrRight == LEFT) {

			string = charToFillWith + string;

		} else if (leftOrRight == RIGHT) {

			string = string + charToFillWith;

		}

	}

	return string;

}
function expandNumber(num) {

	var isNegative;
	//remove minus sign for calculation of sig digits
	if (num.charAt(0)=="-") {

		isNegative = true;
		num = num.replace('-','');

	} else {

		isNegative = false;

	}

	var expandedNumFloat = parseFloat(num) * 100000;
	var stringExpandedNum = expandedNumFloat.toString();

	if (stringExpandedNum.indexOf(".") > 0) {

		stringExpandedNum = stringExpandedNum.substr(0,stringExpandedNum.indexOf("."))

	}

	if (stringExpandedNum.length < 5) {

		stringExpandedNum = charFill(stringExpandedNum, 5, "0", LEFT);

	}

	if (isNegative) {

		stringExpandedNum = '-' + stringExpandedNum;

	}

	return stringExpandedNum;

}
function fixNumber(num){

	if (num.charAt(0)=="-") {

		isNegative = true;
		num = num.replace('-','');

	} else {

		isNegative = false;

	}

	var stringExpandedNum = new String(num);

	if (stringExpandedNum.length < 5) {

		stringExpandedNum = charFill(stringExpandedNum, 5, "0", LEFT);

	}

	if (isNegative) {

		stringExpandedNum = '-' + stringExpandedNum;

	}

	return stringExpandedNum;

}
function contractNumber(num) {

	var numObj = fixNumber(new String(num));

	var lenNum = numObj.length;
	var decimalLoc = lenNum-5;

	var afterDecimal = numObj.substr(decimalLoc, 5);
	var beforeDecimal = numObj.substr(0, decimalLoc);

	return parseFloat(beforeDecimal + '.' + afterDecimal);

}
function prepPointArray(pointArray){

	var sReturn = '';
	var sIndCoords;
	for (i=0;i<pointArray.length;i++){

		sReturn += (expandNumber(new String(pointArray[i].lat())) + ',' + expandNumber(new String(pointArray[i].lng())));

		if (i<pointArray.length-1)
			sReturn += ',';

	}

	return sReturn;

}
function getLastLegDistance(xArray, yArray){

	var distanceToReturn = 0;
	lastPointIdx = xArray.length - 1;
	secondToLastPointIdx = xArray.length - 2;

	if (xArray.length > 1) {

		var fLastLeg;
		distanceToReturn = returnDistanceInMiles(yArray[lastPointIdx], xArray[lastPointIdx], yArray[secondToLastPointIdx], xArray[secondToLastPointIdx]);

	}

	return distanceToReturn;

}

function popInternalArraysForLeg() {

	xArray.pop();
	yArray.pop();
	gLatLngArray.pop();

	updateDistances(xArray, yArray, REMOVE);

	prepMarkerArray();

	pointTypeArray.pop();

	//redraw elevation graph...
	elevationArray.pop();
	ElevationsArrLen = elevationArray.length;
	numberOfFoundElevations--;

}
function removeLastLeg() {

	if (xArray.length > 0) {

		//we determine whether last leg came from directions object, or was directly
		//selected, by looking in pointTypeArray for last point; if last point was marked
		//as from directions object, we loop back through pointTypeArray until we hit a
		//point that was directly selected by user

		//special case for for first point clicked -- marker only, but still need to pop all the arrays
		if ( gLatLngArray.length == 1 ) {

			popInternalArraysForLeg();

		} else if ( pointTypeArray[gLatLngArray.length-2] == CLICKED_POINT ) {

			popInternalArraysForLeg();

		} else {

			//remember that value used for index of pointTypeArray must be evaluated
			//each trip through the loop -- don't make the mistake of putting the value into a
			//variable before the loop.
			while ( pointTypeArray[gLatLngArray.length-2]  == GEOCODED_POINT ) {

				popInternalArraysForLeg();

			}

			//loop above doesn't work for the last point in the sequence, since it looks
			//back two elements, one more pop needed.
			popInternalArraysForLeg();

		}


		//markRouteAsUnsaved call must be before drawPolyLine or line will not be colored correctly
		markRouteAsUnsaved();

		drawPolyLine(gLatLngArray);

		drawMarkers(gLatLngArray);


		//drawElevGraphQString();
		//elevationSwitch(currentElevationGraphHeight);
		drawElevationGraph()


	} else {

		alert('No points to remove.\n\nSince all points have been removed, recording has been turned off. Press recording button again to restart.');
		setRecordingStateAndButtons();

	}

}

function encodePolyline(a) {

	var p = a.split(',');
	var d = '';
	var xo=0;
	var yo=0;

	for(c=0;c<p.length;c+=2) {

		x = p[c];
		xd = x - xo;
		xo = x;
		f = (Math.abs(xd) << 1) - (xd<0);

		do {
			e = f & 31;
			f>>=5;
			if(f){e|=32};
			d+=String.fromCharCode(e+63);
		} while(f!=0);

		y = p[c+1];
		yd = y - yo;
		yo = y;
		f = (Math.abs(yd)<<1)-(yd<0);

		do {
			e = f & 31;
			f>>=5;
			if(f){e|=32};
			d+=String.fromCharCode(e+63);
		} while (f != 0);
	}

	return d;

}
function getQuerystringParameter(paramName, paramString){

	var sReturnStr = '';

	var queryStringObj = new String(paramString)
	var paramNameObj = new String(paramName);
	//queryStringObj = queryStringObj.toLowerCase();
	paramNameObj = paramNameObj.toLowerCase();

	//parameters were sent
	if (queryStringObj.indexOf('?') > -1) {

		var qStringArray = queryStringObj.split('?');

		if (qStringArray[1].length > 0) {

			var allParams = qStringArray[1]
			var paramArray = allParams.split("&");

			for (i=0; i<= paramArray.length-1; i++){

				var origCaseFullParam = paramArray[i];
				var nameValuePairObj = new String(paramArray[i]);
				nameValuePairObj = nameValuePairObj.toLowerCase();
				var nameValuePairArr = nameValuePairObj.split('=');
				var indParamName = nameValuePairArr[0];
				var indParamValue = nameValuePairArr[1];

				if (paramNameObj == indParamName) {

					sReturnStr =  unescape(origCaseFullParam.substr(indParamName.length+1));
					break;

				}
				//var origCaseFullParam = paramArray[i];
				//var lcaseFullParam = paramArray[i].toLowerCase();

				//if (lcaseFullParam.indexOf(paramNameObj) > -1)
				//
				//	sReturnStr =  unescape(origCaseFullParam.substr(paramNameObj.length));

			}


		}


	}

	return sReturnStr;

}
function addBookmark(title,url) {

	window.external.AddFavorite( url, title);

}
function createPointListForRoute(pointArray){

	var sResult = '';
	for (var i = 0; i<pointArray.length; i++){

		sResult += pointArray[i].lat() + 'a' + pointArray[i].lng();

		if (i < pointArray.length - 1) {

			sResult += 'a';

		}

	}

	return sResult;

}
function returnPermalinkString(){

	var curCenterX = map.getCenter().lng();
	var curCenterY = map.getCenter().lat();

	var sPoints = '';
	if (gLatLngArray.length > 0) {

		//sPoints = encodePolyline(prepPointArray(gLatLngArray));
		sPoints = createPointListForRoute(gLatLngArray);

	}

	var locationString = new String(location.href);
	var locationArr = locationString.split('?');

	locationString = locationArr[0];

	//return (locationString + '?centerX=' + escape(curCenterX) + '&centerY=' + escape(curCenterY) + '&zl=' + new String(map.getZoom()) + '&fl=' + createFeatureListString() + '&polyline=' + escape(sPoints) + '&elev=' + createElevationQueryString());
	return ('centerX=' + escape(curCenterX) +
		'&centerY=' + escape(curCenterY) +
		'&zl=' + new String(map.getZoom()) +
		'&zv=2' +
		'&fl=' + createFeatureListString() +
		'&polyline=' + escape(sPoints) +
		'&elev=' + createElevationQueryString() +
		'&rId=' + rId +
		'&rdm=' + getRouteDrawMode() +
		'&pta=' + pointTypeArray.join() );

}
function createFeatureListString() {

	var sResult;

	sResult = getCurrentOverlayType();
	sResult += "-";

	sResult += ((getCurrentUnits() == METRIC) ? 'm' : 'e');
	sResult += "-";

	sResult += ((document.getElementById('weightRow').style.display=='none') ? 'h' : 's');
	sResult += "-";

	sResult += escape(document.controlPanel.weight.value);

	sResult += "-";
	sResult += ((showMarkers==true) ? '1' : '0');

	return sResult;

}
function createTinyURL() {

	document.getElementById("url").value = returnPermalinkString();
	document.tinyUrlForm.submit();

}
function createPermalink(){

	//location.href=returnPermalinkString();

	saveRoute(returnPermalinkString());
	markRouteAsSaved();
	//drawPolyLine(gLatLngArray);
	//drawMarkers(gLatLngArray);

}
function displayRouteUrlMessage(){

	document.getElementById('routeUrlMessage').innerHTML = "<div style='color:#ff0000'>URL for this route is: http://www.gmap-pedometer.com/?r="+rId+" " + ((document.all)?"<a href=\"javascript:addBookmark('Gmap Pedometer Route "+rId+"','http://www.gmap-pedometer.com/?r="+rId+"');\">Add bookmark</a>":"");
	//document.getElementById('routeUrlMessage').innerHTML = "URL for this route is: http://www.gmap-pedometer.com/?r="+rId;

}
function markRouteAsUnsaved(){

	routeSaved = false;

}
function markRouteAsSaved(){
	//saving message will be changed to "saved" after ajax call completes
	//currently being set to "Saving..."
	//document.getElementById('saveLink').innerHTML = saveLinkSaving;
	routeSaved = true;
}
function getRoute(routeId){

	var ajaxUrl;
	if ( parseInt( routeId ) < 5000000 )
	{
		ajaxUrl = "getRoute.php";
	}
	else
	{
		ajaxUrl = "/gp/" + ENVIRONMENT_IDENTIFIER + "ajaxRoute/get";
	}

	$.ajax({
		url: ajaxUrl,
		type: 'POST',
		data: 'rId=' + routeId,
		success: function( myData )
		{

			//setting paramString eq to string from db
			paramString = '?' + myData;
			//erase "looking up route" message we wrote earlier.
			document.getElementById("map").innerHTML='';
			drawMap();
			rehydrateMapFromUrl();

		}
	});
}
function getCurrentOverlayType(){

	var sResult;

	if ( map.getMapTypeId() == google.maps.MapTypeId.SATELLITE ) {

		sResult = 's';

	} else if ( map.getMapTypeId() == google.maps.MapTypeId.ROADMAP ) {

		sResult = 'm';

	} else if ( map.getMapTypeId() == google.maps.MapTypeId.HYBRID ) {

		sResult = 'h';

	} else if ( map.getMapTypeId() == "USGS" ) {

		sResult = 't';

	} else if ( map.getMapTypeId() == "USGSoldskool" ) {

		sResult = 'k';

	} else if ( map.getMapTypeId() == google.maps.MapTypeId.TERRAIN ) {

		sResult = 'p';

	} else if ( map.getMapTypeId() == "OSM" ) {

		sResult = 'o';

	} else if ( map.getMapTypeId() == "OpenCycle" ) {

		sResult = 'c';

	}

	return sResult;

}
function getCurrentUnitsCode(){
	return ( getCurrentUnits() == METRIC ) ? 'm' : 'e';
}
function getCurrentShowNameDescriptionState()
{
	return ( ( $( '.nameRow' ).css( 'display' ) == 'block' ) ? 't' : 'f' );
}
function getCurrentShowWeightState(){
	//return ((document.getElementById('weightRow').style.display=='none') ? 'h' : 's');
	return ( ( $( '.weightRow' ).css( 'display' ) == 'none' ) ? 'h' : 's' );
}
function getCurrentWeight(){
	//return escape(document.controlPanel.weight.value);
	return escape( $( '#weight' ).val() );
}
function getCurrentShowMarkersState(){
	return ((showMarkers==true) ? '1' : '0');
}
function setAndAppendField( prefix, fieldName, value, buffer ){

	if (prefix) prefix += "_";

	if ( typeof ( buffer ) == "string" ) {

		buffer += prefix + fieldName + "=" + escape( value ) + "&";

	} else {

		var tempField = document.createElement("input");
		tempField.setAttribute( "name", prefix + fieldName );
		tempField.setAttribute( "id", prefix + fieldName );
		tempField.setAttribute( "value", value );

		buffer.appendChild( tempField );

	}

	return buffer;
}
function saveRouteFireModal(){

	if ( suppressSaveModal == false ){

		//first save on a new route
		if ( rId.length == 0 ) {

			if ( isLoggedIn == LOGINSTATE_IS_LOGGEDIN ) {

				//save the route and show a modal with the routeID

				$.fn.colorbox( {
					href:"/gp/" + ENVIRONMENT_IDENTIFIER + "ajaxRoute/saveToAccount",
					overlayClose:true,
					width:"80%",
					height:"80%",
					iframe:true,
					open:true,
					onClosed:getHeader
				} );

			} else if  ( isLoggedIn == LOGINSTATE_NOT_LOGGEDIN )  {

				//show modal that asks if user wants to store route in account or make public
				//will need to take different actions based on choice --
				//if user wants to login/register, more UI in the modal, ending up with message showing routeID. If
				//if not, we save the UI in the modal but still show routeID
				$.fn.colorbox( {
					href:"saveWithoutLogin.html",
					overlayClose:false,
					width:"80%",
					height:"80%",
					iframe:true,
					open:true,
					onClosed:getHeader
				} );

			} else {

				//should never happen
				alert( 'We\'re still checking if you\'re logged in -- hang on and try again in a few moments.' )
				return;

			}

			//user has attempted to save while viewing a route that was loaded from querystring
		} else {

			if ( isLoggedIn == LOGINSTATE_IS_LOGGEDIN ) {

				//call symfony action (modal) that figures out if this is your
				//route, and offers to save changes (if it's yours) or create a copy
				//(if it's not yours, or if it is yours and you'd rather not slam its
				//previous state)

				$.fn.colorbox( {
					href:"/gp/" + ENVIRONMENT_IDENTIFIER + "ajaxRoute/isRouteOwner?rId=" + rId,
					overlayClose:true,
					width:"80%",
					height:"80%",
					iframe:true,
					open:true,
					onClosed:getHeader
				} );

			} else if  ( isLoggedIn == LOGINSTATE_NOT_LOGGEDIN )  {

				//present modal prompting user to login, therafter flow follows
				//login in preceding case

				$.fn.colorbox( {
					href:"/gp/" + ENVIRONMENT_IDENTIFIER + "ajaxRoute/isRouteOwner?rId=" + rId,
					overlayClose:true,
					width:"80%",
					height:"80%",
					iframe:true,
					open:true,
					onClosed:getHeader
				} );

			} else {

				//should never happen
				alert( 'We\'re still checking if you\'re logged in -- hang on and try again in a few moments.' )
				return;

			}

		}

	}

	//not an initial save, no ui needed, just need to update the UI element showing the routeID
	else
	{

		saveRoute();

	}

	//line below now occurs within saveRoute() itself -- modal was being surpressed even if user used "esc" to break out of it on first save
	//suppressSaveModal = true;

}
function postToFacebook() {

	var linkValue = "http://www.gmap-pedometer.com";
	var descriptionValue = 'You should check out www.gmap-pedometer.com -- the fast and easy way to check the distance of your workouts!';

	if ( ( typeof( rId ) != "undefined") && (rId != "")  )
	{
		linkValue += "?r=" + rId;
		descriptionValue = 'I did ' +
			parseInt(returnDistanceInChosenUnits(distancesArray[distancesArray.length-1])*100)/100 + ' ' + ((getCurrentUnits() == METRIC) ? 'km' : 'mi') +
			" today and I measured my distance on www.gmap-pedometer.com!";
	}

	// calling the API ...
	var obj = {
		method: 'feed',
		link: linkValue,
		name: 'Gmap-Pedometer.com',
		description: descriptionValue
	};

	function callback(response) {
		//nothing to see here, please move along
	}

	FB.ui(obj, callback);
}
function addTweetButton( rId ){

	var routeStr;
	var dataStr;
	if ( typeof( rId ) == "undefined" || rId == ""  )
	{
		routeStr = '" '
		dataStr = '"Use an online map to measure your workouts!" ';
	}
	else
	{
		routeStr = '?r='  + rId + '" '
		dataStr = '"I did ' + parseInt(returnDistanceInChosenUnits(distancesArray[distancesArray.length-1])*100)/100 + ' ' + ((getCurrentUnits() == METRIC) ? 'km' : 'mi') + ' today!" ';
	}

	var tweetHtml = '<script src="//platform.twitter.com/widgets.js" type="text/javascript"></script>' +
		'<div>' +
		'<a href="https://twitter.com/share" class="twitter-share-button" ' +
		'data-via="GmapPedometer"' +
		'data-url="http://gmap-pedometer.com' + routeStr +
		'data-text=' + dataStr +
		'data-count="none">Tweet</a>' +
		'</div>';

	$( '#tweetHolder').html( tweetHtml );

}
function saveRoute( saveSource ){

	var stringToSend = "";
	stringToSend = prepareFieldsForSave( stringToSend );

	$.ajax({
		url: '/gp/' + ENVIRONMENT_IDENTIFIER + 'ajaxRoute/createUpdate',
		type: 'POST',
		data: stringToSend,
		success: function( myData )
		{

			//symfony adds a couple of carriage returns to the output, so parseInt to clip them off
			rId = parseInt( myData );
			//document.getElementById('saveLink').innerHTML = saveLinkInactive;
			//displayRouteUrlMessage();
			if ( saveSource == "modal" ){

				//var modalIframe = document.getElementById( "cboxIframe" ).src = "saveResponse.php?r="+rId;
				var modalIframe = $( ".cboxIframe" )[0].src = "saveResponse.php?r="+rId;

			}
			//after the initial save don't show the modal dialog
			suppressSaveModal = true;
			$( '#routeUrlMessage' ).html( "current route: http://" + location.host + "?r="  + rId );
			addTweetButton( rId );

		}
	});

}
function sanitize( stringToSanitize ){

	//sql protect first
	stringToSanitize.replace( '\'', '\'\'' );

	//now xss
	stringToSanitize.replace( '<', '&lt;' );
	stringToSanitize.replace( '>', '&gt;' );

	return stringToSanitize;

}
function calculateElevationChange()
{
	return returnSmallDistanceInChosenUnits( elevationArray[ elevationArray.length - 1 ] - elevationArray[0] );
}
function calculateElevationGain()
{
	var gain = 0;
	for (i=0; i<elevationArray.length; i++)
	{
		if (i>0 && elevationArray[i] > elevationArray[i-1])
		{
			gain = gain + ( elevationArray[i] - elevationArray[i-1] );
		}
	}
	return returnSmallDistanceInChosenUnits( gain );
}
function nameDescriptionSavePrep( currentHtml )
{
	var rslt = "";
	if ( currentHtml != "[Click to enter text]" )
	{
		rslt = sanitize( currentHtml );
	}
	return rslt;
}
function prepareFieldsForSave( saveRouteBuffer ){

	saveRouteBuffer = setAndAppendField( "", "id", rId, saveRouteBuffer );
	saveRouteBuffer = setAndAppendField( "", "distance", $( "#mileage").html(), saveRouteBuffer );
	saveRouteBuffer = setAndAppendField( "", "show_name_description", getCurrentShowNameDescriptionState(), saveRouteBuffer );
	saveRouteBuffer = setAndAppendField( "", "name", nameDescriptionSavePrep( $( "#nameData").html() ), saveRouteBuffer );
	saveRouteBuffer = setAndAppendField( "", "description", nameDescriptionSavePrep( $( "#descriptionData").html() ), saveRouteBuffer );
	saveRouteBuffer = setAndAppendField( "", "center_lat", map.getCenter().lat(), saveRouteBuffer );
	saveRouteBuffer = setAndAppendField( "", "center_lng", map.getCenter().lng(), saveRouteBuffer );
	saveRouteBuffer = setAndAppendField( "", "zoom_level", map.getZoom(), saveRouteBuffer );
	saveRouteBuffer = setAndAppendField( "", "overlay_type", getCurrentOverlayType(), saveRouteBuffer );
	saveRouteBuffer = setAndAppendField( "", "units", getCurrentUnitsCode(), saveRouteBuffer );
	saveRouteBuffer = setAndAppendField( "", "show_weight", getCurrentShowWeightState(), saveRouteBuffer );
	saveRouteBuffer = setAndAppendField( "", "weight", getCurrentWeight(), saveRouteBuffer );
	saveRouteBuffer = setAndAppendField( "", "show_markers", getCurrentShowMarkersState(), saveRouteBuffer );
	saveRouteBuffer = setAndAppendField( "", "draw_mode", getRouteDrawMode(), saveRouteBuffer );
	saveRouteBuffer = setAndAppendField( "", "elevation_graph_height", currentElevationGraphHeight, saveRouteBuffer );
	saveRouteBuffer = setAndAppendField( "", "elevation_gain", calculateElevationGain(), saveRouteBuffer );
	saveRouteBuffer = setAndAppendField( "", "elevation_change", calculateElevationChange(), saveRouteBuffer );

	for (var i = 0; i<gLatLngArray.length; i++){

		saveRouteBuffer = setAndAppendField( "point"+i, "lat", gLatLngArray[i].lat(), saveRouteBuffer );
		saveRouteBuffer = setAndAppendField( "point"+i, "lng", gLatLngArray[i].lng(), saveRouteBuffer );
		saveRouteBuffer = setAndAppendField( "point"+i, "elevation", Math.round(elevationArray[i]*100), saveRouteBuffer );
		saveRouteBuffer = setAndAppendField( "point"+i, "source", pointTypeArray[i], saveRouteBuffer );

	}

	saveRouteBuffer = setAndAppendField( "", "numPoints", gLatLngArray.length, saveRouteBuffer );

	return saveRouteBuffer;

}
function saveRouteUsingColorbox() {

	var modalBoxElementName = document.getElementById( "cboxIframe" ).name;
	var saveRouteForm = document.createElement("form");
	saveRouteForm.setAttribute( "method", "post" );
	saveRouteForm.setAttribute( "action", "/gp/" + ENVIRONMENT_IDENTIFIER + "ajaxRoute/createUpdate" );
	saveRouteForm.setAttribute( "target", modalBoxElementName );
	saveRouteForm.setAttribute( "rel", "moodalbox" )
	saveRouteForm.style.display = "none";

	saveRouteForm = prepareFieldsForSave( saveRouteForm );

	document.body.appendChild(saveRouteForm);

	saveRouteForm.submit();

}
function decodePolyline(a) {

	if (rId.length == 0) {

		var b=a.length;
		var c=0;
		var d=new Array();
		var e=0;
		var f=0;
		while(c < b){
			var g;
			var h=0;
			var i=0;
			do{
				g=a.charCodeAt(c++)-63;
				i = i | (g&31)<<h;
				h = h + 5
			}while(g>=32);
			var l;
			if (i & 1){
				l = ~(i >> 1);
			} else {
				l = i >> 1;
			}

			e = e + l;
			d.push(e);

			h=0;
			i=0;
			do{
				g=a.charCodeAt(c++)-63;
				i = i | (g&31)<<h;
				h = h + 5;
			}while(g>=32);

			var m
			if (i & 1)
				m = ~(i >> 1);
			else
				m = i >> 1

			f = f + m;
			d.push(f)
		}
		return d;

	} else {

		var retArr = a.split('a');

		return retArr;

	}
}
function clearLinkHandler(){

	if (bRecordPoints) {

		if (confirm("Are you sure you want to clear the route you've created?\nClicking OK to will clear all points and stop recording.\nClicking Cancel will continue recording and leave points as they are. \nIf you have been saving this route, further changes will be saved with a different route id.")) {

			//distances array slightly different from all the other arrays;
			//it's initialized with a first element of 0.
			distancesArray.splice(1,distancesArray.length-1);

			//array splices
			legArray.splice(0,legArray.length);
			gLatLngArray.splice(0,gLatLngArray.length);
			xArray.splice(0,xArray.length);
			yArray.splice(0,yArray.length);
			mileMarkersToDraw.splice(0,mileMarkersToDraw.length)
			elevationArray.splice(0,elevationArray.length);
			pointTypeArray.splice(0,pointTypeArray.length);

			//set to 0...
			numberOfFoundElevations = 0;
			ElevationsArrLen = 0;

			$( '#mileage' ).html( '0.0000' );
			$( '#calories' ).val( '0.0000' );
			//document.controlPanel.mileage.value='0';
			//document.controlPanel.lastLeg.value='0';
			//document.controlPanel.calories.value='0';

			drawElevationGraph();

			setRecordingStateAndButtons();

			//clear any routeid, so that user doesn't lose last route.
			if (rId != '') {

				document.getElementById('routeUrlMessage').innerHTML = "<div style='color:#ff0000'>New route started.</div>";

			}

			suppressSaveModal = false;
			markRouteAsUnsaved();
			rId = '';

			addTweetButton( rId );
		}
	} else {

		alert('No points to clear');

	}
}
function clearMarkers(){

	for (var prop in ptHash) {

		if( ptHash.hasOwnProperty( prop ) ){

			ptHash[ prop ].setMap( null );
			delete ptHash[ prop ];

		}

	}

}
function clearPolylines(){

	for ( var i = polyLineSegmentsArr.length-1; i >= 0 ; i-- ){

		polyLineSegmentsArr[ i ].setMap( null );
		polyLineSegmentsArr.pop();

	}

}
function clearOverlays(){

	//reproduced functionality from v2 map.clearOverlays() method
	clearPolylines();
	clearMarkers();

}
function setRecordingStateAndButtons()
{
	bRecordPoints=false;

	if ( defaultLocMarker == undefined )
	{
		clearOverlays();
		$( '#startRecording' ).val( 'Start recording' );
	}
	else
	{
		//hear the song of the ancient hacker!
		//o, but for the code has been sitting around here a loooong fuckin time
		//lo, but the bugs are yucky, and are all 100% mine
		//ah, tis shamefully hacky to stick a marker in a temp var whilst clearing overlays
		//but screw it, ain't got time for pretty code until I work on this project during the day.
		//
		//thank you. we'll be here all week. please remeber to tip your server.
		// var tmpDefaultLocMarker = defaultLocMarker;
		clearOverlays();
		// defaultLocMarker = tmpDefaultLocMarker;
		// map.addOverlay( defaultLocMarker );
		// defaultLocMarker

		//if user started from "other location" the default marker is hidden.
		//since this action is a reset, just make sure it's always shown.
		defaultLocMarker.setMap( map );

		$( '#recordFromDefaultLoc' ).val( "Default location" );
		$( '#recordFromOtherLoc' ).val( "Other location" );
	}

}
function drawMarkers(gLatLngArray){

	clearMarkers();

	//drawmarkers is called from toggleMarkers before route is created when rehydrating...
	if (gLatLngArray.length > 0) {

		if (showMarkers) {

			drawStopStartMarker(gLatLngArray[0],START);

			drawStopStartMarker(gLatLngArray[gLatLngArray.length-1],STOP);

			for (var m=0;m<mileMarkersToDraw.length;m++) {

				var imageUrl;

				var mileNum = m+1;
				if (mileNum<11) {

					imageUrl = "unitMarker."+mileNum+".png";

				} else {

					imageUrl = "unitMarker.php?nm="+mileNum;

				}

				var icon = {
					url: imageUrl,
					size: new google.maps.Size(20, 34),
					origin: new google.maps.Point(0, 0),
					anchor: new google.maps.Point(9, 34)
				};

				drawMileMarker(mileMarkersToDraw[m], icon, m);

			}

		}

	} else {

		//intent of clearing overlay is if we want to remove last point (which is start point and not in latlngarray?)
		//but defaultLocMarker (which is global) is dropped before this call and shouldn't get cleared.
		// if ( typeof( ptHash[ START ] ) !=  "undefined" )
		// {
		// 	ptHash[ START ].setMap( null );

//				if ( typeof( defaultLocMarker ) != "undefined" )
//				{
//					var tmpDefaultLocMarker = defaultLocMarker
//				}
//				//only way we arrive here is if we are removing the last point
//				map.clearOverlays();

		// }
	}

}
function drawStopStartMarker(gLatLng,id){

	//Draws the markers at the beginning end the of the route, as distinguished from the mile markers
	//parameters:
	//	gLatLng: gLatLng object from the gLatLngArray array
	//	id: NAME of the ptHash item -- ptHash is, as the name suggests, a hashtable -- milemarkers have a name matching their mile marker, e.g. the string "1" for mile marker 1.
	//	However, the id passed in here will be the word START or STOP -- the start and stop markers have a hashname that distinguishes them from mile markers.


	//redraw marker. Should this only happen for end marker? Could be that whole overlay gets blanked out each time, and that's why we need to redraw start too?
	ptHash[id] = new google.maps.Marker({
		position: gLatLng,
		map: map
	});
	// map.addOverlay(ptHash[id]);
	// ptHash[ id ].setMap( map );

}
//iterates through mileMarkersToDraw loop and removes any already
//existing mile markers. Needed in cases like removeLeg, where the
//gLatLng array may no longer contain all the markers
function removeAllMileMarkers(){

	//map.clearOverlays();

	for (var m=0;m<mileMarkersToDraw.length;m++) {

		if (ptHash[m] != undefined){

			ptHash[m].setMap( null );
			// map.removeOverlay(ptHash[m]);
			delete ptHash[m];
			// ptHash[m] = undefined;

		}

	}
}
//markers are drawn only if they are within bounds of the map, and only if they are not already on the map
function drawMileMarker(gLatLng, icon, idx){

	var bRemove = false;
	var bAdd = false;

	// if (map.getBounds().contains(gLatLng)){

	if (ptHash[idx] == undefined){

		ptHash[idx] = new google.maps.Marker({
			position: gLatLng,
			icon: icon,
			map: map
		});
		// map.addOverlay(ptHash[idx]);

	}

	// 	} else {

	// if (ptHash[idx] != undefined){

	// 	ptHash[ idx ].setMap( null );
	// 	// map.removeOverlay(ptHash[idx]);
	// 	ptHash[idx] = undefined;

	// }

	// 	}


}
//google's built-in intersect function on bounds is buggy, rolled me own.
//with thanks to http://www.tekpool.com/?p=23
function doBoundsIntersect(rect1, rect2){

	var left1, right1, top1, bottom1;
	var left2, right2, top2, bottom2;

	left1 = rect1.minX;
	right1 = rect1.maxX;
	top1 = rect1.minY;
	bottom1 = rect1.maxY;

	left2 = rect2.minX;
	right2 = rect2.maxX;
	top2 = rect2.minY;
	bottom2 = rect2.maxY;

	return !(left2 > right1 || right2 < left1 || top2 > bottom1 || bottom2 < top1);

}
//helper function for drawPolyLine
function drawPolyLineSegment(routeColor){

	polyLineSegmentsArr.push( new google.maps.Polyline({
		path: currentLine,
		strokeColor: routeColor,
		map: map
	}) );
	// map.addOverlay(polyLineSegmentsArr[routeSegmentsCount]);
	// routeSegmentsCount++;
	// currentLine.splice(0,currentLine.length)

}
//polyline is now drawn in multiple segments. Only segments where both points are within bounds are drawn
function drawPolyLine(gLatLngArray){
	clearPolylines();

	polyLineSegmentsArr.push( new google.maps.Polyline({
		path: gLatLngArray,
		strokeColor: '#0000FF',
		map: map
	}) );
	// for (var i=0;i<routeSegmentsCount;i++){

	//  		map.removeOverlay(polyLineSegmentsArr[i]);
	// }
	// routeSegmentsCount = 0;
	// //this function may be called from removeLastLeg, in which case
	// //we still want to clear points (above) but don't want to draw a new one.
	// if (gLatLngArray.length > 0) {
	// 	var routeColor;
	// 	// if (routeSaved){
	// 		routeColor = '#0000FF';
	// 	// } else {
	// 	// 	routeColor = '#FF0000';
	// 	// }
	// 	//to determine whether to draw a line segment, we check whether the rectangle described by the segment
	// 	//intersects with the rectangle described by the current screen. If we just checked whether the begin and
	// 	//end points were on the current map, we'd miss lines that pass through the current map without originating
	// 	//there.
	// 	var lastPtAdded = false;
	// 	// var mapSW = map.getBounds().getSouthWest();
	// 	// var mapNE = map.getBounds().getNorthEast();
	// 	//using GBounds instead of GLatLngBounds because a GBound can be created using any two points.
	// 	//Constructor of GLatLngBounds requires we calculate NE and SW corners of bounds, which we may not have
	// 	// var mapGBounds = new google.maps.LatLngBounds(new Array(map.fromLatLngToDivPixel(mapSW),map.fromLatLngToDivPixel(mapNE)));
	// 	// var thisGBounds;
	// 	// var nullPoint = new GPoint(0,0)
	// 	for (var j=1; j<gLatLngArray.length; j++){
	// 		// thisGBounds = new google.maps.LatLngBounds(new Array(map.fromLatLngToDivPixel(gLatLngArray[j]),map.fromLatLngToDivPixel(gLatLngArray[j-1])));
	// 		// if (doBoundsIntersect(mapGBounds,thisGBounds)){
	// 			if (!lastPtAdded){
	// 				currentLine.push(gLatLngArray[j-1]);
	// 			}
	// 			currentLine.push(gLatLngArray[j]);
	// 			lastPtAdded = true;
	// 		// } else {
	// 		// 	lastPtAdded = false;
	// 		// 	if (currentLine.length > 0){
	// 		// 		drawPolyLineSegment(routeColor);
	// 		// 	}
	// 		// }
	// 	}
	// 	if (currentLine.length > 0){
	// 		drawPolyLineSegment(routeColor);
	// 	}
	// }
}
function setCurrentUnits(unitsToSet){

	var unitInput = document.controlPanel.units;

	if (unitsToSet == ENGLISH) {

		unitInput[0].checked = true;
		unitInput[1].checked = false;

	} else if (unitsToSet == METRIC) {

		unitInput[0].checked = false;
		unitInput[1].checked = true;

	}

}
function setRouteDrawMode( modeToSet ){

	var intMode = parseInt( modeToSet );

	for (var i=0; i<=2; i++) {

		if ( i == intMode ) {

			document.controlPanel.legDraw[ i ].checked = true;

		} else {

			document.controlPanel.legDraw[ i ].checked = false;

		}

	}


}
function getRouteDrawMode(){

	var rslt;

	var legDrawInput = document.controlPanel.legDraw;

	if (legDrawInput[0].checked) {

		rslt = DRAW_RUNNING;

	} else if (legDrawInput[1].checked) {

		rslt = DRAW_BIKING;

	} else if (legDrawInput[2].checked)  {

		rslt = DRAW_MANUAL;

	}

	return rslt;

}
function shouldUseDirectionsForDrawingLeg( isLoadFromQueryString, isCreatingThereAndBack, numPoints ){

	var rslt = false;

	//if loading from querystring, points are known and should not be calculated
	//same is true if pt is being added as "there and back"
	//also, if this is the first point then directions object can not be used
	if ( ( ! isLoadFromQueryString ) && ( ! isCreatingThereAndBack )  && (numPoints > 0) ) {

		var legDrawInput = document.controlPanel.legDraw;

		if (legDrawInput[0].checked || legDrawInput[1].checked) {

			rslt = true;

		}

	}

	return rslt;

}
function getCurrentUnits(){

	var curValue;
	var unitInput = document.controlPanel.units;
	//var unitInput = document.getElementById("units");

	if (unitInput[0].checked) {

		curValue = ENGLISH;

	} else if (unitInput[1].checked) {

		curValue = METRIC;

	}

	return curValue;


}
function getCurrentMultiplier(type){

	var curValue = getCurrentUnits();

	var multiplier;

	if (type == DISTANCE) {

		if (curValue==METRIC) {

			multiplier = 1.609345;

		} else {

			multiplier = 1.0;

		}

	} else if (type ==  WEIGHT) {

		if (curValue==METRIC) {

			multiplier = 0.45359237;

		} else {

			multiplier = 1.0;

		}

	} else if (type ==  SMALLDISTANCE) {

		if (curValue==METRIC) {

			multiplier = 0.3048;

		} else {

			multiplier = 1.0;

		}

	}

	return multiplier;

}
function returnSmallDistanceInChosenUnits(valueToApplyTo){

	var multiplier = getCurrentMultiplier(SMALLDISTANCE);

	return valueToApplyTo * multiplier;

}
function roundToTwoDecimalPlaces(decNum){

	return Math.round(decNum * 100)/100;

}
function returnDistanceInChosenUnits(valueToApplyTo){

	var multiplier = getCurrentMultiplier(DISTANCE);

	return valueToApplyTo * multiplier;

}

function toggleMarkers(showOrHide){

	if (showOrHide == SHOW) {

		showMarkers = true;
		document.getElementById('markerSwitch').innerHTML = 'Turn <a href="javascript:toggleMarkers(HIDE);">off</a> mile markers';

	} else if (showOrHide == HIDE) {

		showMarkers = false;
		document.getElementById('markerSwitch').innerHTML = 'Turn <a href="javascript:toggleMarkers(SHOW);">on</a> mile markers';

	}

	//whether we turned them off or on, we need to redraw.
	prepMarkerArray();
	drawMarkers(gLatLngArray);

}
function toggleNameDescription(showOrHide){

	//DUMBASS:
	//before you bang your head off this s**t again, read this!
	//1) you need name and description to have 100% height, so that the controlbox will expand with the user's input
	//2) jquery doesn't play nice with animating a 100% height. It thinks you mean 100% of window, so you get this crazy
	//effect where the box stretches to take up the whole screen before shrinking down.
	//you're one dude, and you don't have much time. This is not worth wrestling with. the effects as they are
	//maybe are an iota less fun than an animation that shrinks or grows, but you still get a nice fade. live with that.

	if (showOrHide == SHOW) {

		document.getElementById('nameDescriptionSwitch').innerHTML = 'Turn <a href="javascript:toggleNameDescription(HIDE);">off</a> name and description';

		$( '.nameRow' ).show();
		$( '.descriptionRow' ).show();
		$('.nameRow').fadeTo( 250, 1.0 );
		$( '.descriptionRow').fadeTo( 250, 1.0 );

		var heightToAdd = $( '.nameRow' ).height() + $( '.descriptionRow' ).height();
		$( '#controls' ).height( $( '#controls' ).height() + heightToAdd );


	} else if (showOrHide == HIDE) {

		document.getElementById('nameDescriptionSwitch').innerHTML = 'Turn <a href="javascript:toggleNameDescription(SHOW);">on</a> name and description';

		var heightToSubtract = $( '.nameRow' ).height() + $( '.descriptionRow' ).height();

		$( '.nameRow').fadeTo( 250, 0.0, function(){ $( '.nameRow' ).hide(); } );
		$( '.descriptionRow' ).fadeTo( 250, 0.0, function(){ $( '.descriptionRow' ).hide(); } );

		//tried putting this in the callback for one of the the fadeTo() calls above, but it was being called twice for some reason.
		//the 250 MS wait is enough to make sure the box shrinks only after the fields hide.
		setTimeout( function(){ $( '#controls' ).height( $( '#controls' ).height() - heightToSubtract ); }, 250 );

	}

}
function toggleCalorieCounter(showOrHide){

	if (showOrHide == SHOW) {

		document.getElementById('calorieCounterSwitch').innerHTML = 'Turn <a href="javascript:toggleCalorieCounter(HIDE);">off</a> calorie counter';

//			$( '.weightRow' ).css( 'visibility', 'visible' );
//			$( '.calorieRow' ).css( 'visibility', 'visible' );
//
//			$( '.weightRow' ).animate( { height : '1.5em' }, 500 );
//			$( '.calorieRow' ).animate( { height : '1.5em' }, 500 );
		$( '.weightRow' ).show();
		$( '.calorieRow' ).show();

		$('.weightRow').fadeTo( 250, 1.0 );
		$( '.calorieRow').fadeTo( 250, 1.0 );

		var heightToAdd = $( '.weightRow' ).height() + $( '.calorieRow' ).height();
		$( '#controls' ).height( $( '#controls' ).height() + heightToAdd );

	} else if (showOrHide == HIDE) {

		//calorie counter defaults off, in which case below code will make controls box smaller than content
		if ( $( '.weightRow').css( 'display' ) == "block" )
		{
			document.getElementById('calorieCounterSwitch').innerHTML = 'Turn <a href="javascript:toggleCalorieCounter(SHOW);">on</a> calorie counter';

//				$( '.weightRow' ).animate( { height : '0' }, 500, function(){ $( '.weightRow' ).css( 'visibility', 'hidden' ) } );
//				$( '.calorieRow' ).animate( { height : '0' }, 500, function(){ $( '.calorieRow' ).css( 'visibility', 'hidden' ) } );
			var heightToSubtract = $( '.weightRow' ).height() + $( '.calorieRow' ).height();

			$( '.weightRow').fadeTo( 250, 0.0, function(){ $( '.weightRow' ).hide(); } );
			$( '.calorieRow' ).fadeTo( 250, 0.0, function(){ $( '.calorieRow' ).hide(); } );

			//tried putting this in the callback for one of the the fadeTo() calls above, but it was being called twice for some reason.
			//the 250 MS wait is enough to make sure the box shrinks only after the fields hide.
			setTimeout( function(){ $( '#controls' ).height( $( '#controls' ).height() - heightToSubtract ); }, 250 );

		}

	}

}
function updateWeightBoxWithUnitToggle(unitsToSet){

	//only needs to be done if units were actually changed. onclick fires even if value did not change
	if (unitsToSet != currentWeightUnits) {

		var rawWeightVal = document.controlPanel.weight.value;
		var convertedWeight;

		//if value is currently metric, then it was english previously, and needs lb --> kg conversion
		if (getCurrentUnits() == METRIC) {

			convertedWeight = parseFloat(rawWeightVal) * .45359237;

			//if value is currently english, then it was metric previously, and needs to kg --> lb conversion
		} else {

			convertedWeight = parseFloat(rawWeightVal) * 2.20462262;

		}

		document.controlPanel.weight.value=convertedWeight;
		currentWeightUnits = getCurrentUnits();

	}

	//if (getCurrentUnits() == METRIC) {
	//
	//	weightInKg = parseFloat(rawWeightVal);
	//
	//} else {
	//
	//	weightInKg = parseFloat(rawWeightVal) * .45359237;
	//
	//}

}
function handleUnitToggle(unitsToSet){

	updateWeightBoxWithUnitToggle(unitsToSet);
	setUnitLabels(unitsToSet);
	//if we switch units, it affects the mile markers, so we need to recalculate mile markers and redraw the polyline if we switch
	prepMarkerArray();
	//drawPolyLine(gLatLngArray);
	drawMarkers(gLatLngArray);

	//call elevationswitch to make sure we redraw graph appropriately
	elevationSwitch(currentElevationGraphHeight)

}
function setUnitLabels(unitsToSet){

	if (unitsToSet == METRIC) {

		$( '#dstUnits1' ).html( 'km' );
		$( '#wtUnits' ).html( 'kg' );

	} else if (unitsToSet == ENGLISH) {

		$( '#dstUnits1' ).html( 'miles' );
		$( '#wtUnits' ).html( 'lb' );

	}

	updateDistanceBoxes();

}
function setUnits(unitsToSet){

	if (unitsToSet != getCurrentUnits()) {

		setCurrentUnits(unitsToSet)
		setUnitLabels(unitsToSet);

	}

}
function geoCode(){

	var geocoder = new google.maps.Geocoder();
	geocoder.geocode( { address: document.getElementById("locationBox").value }, function( results, status ){

		var zoomLevelObj = document.locationSearch.zoom_level;
		var zoomLevelObjVal = parseInt(zoomLevelObj[zoomLevelObj.selectedIndex].value);

		map.setCenter( results[0].geometry.location );
		map.setZoom( zoomLevelObjVal );

	});

}
function showCountry(){

	var countryList = document.locationSearch.country;

	countryList.style.display='inline';

}
function printMap(){

	//convertSvgPolylinesToGifs();

	document.getElementById("searchBox").style.display = 'none';
	document.getElementById("copy").style.display = 'none';
	document.getElementById("printDone").style.display = 'block';

	document.getElementById("mapPane").style.left = '0';

	window.print();

}
// function convertSvgPolylinesToGifs() {

// 	var svgNodes = document.getElementsByTagName( 'svg' );

// 	if ( svgNodes.length > 0 ){

// 		svgParent = svgNodes[0].parentNode;

// 		//svgCache and svgParent are globals, which are used to put the svg tags back after printing is done.
// 		svgCache = svgParent.innerHTML;
// 		svgParent.innerHTML = '';

// 		//argh this is so hacky. can't get text of SVG nodes from their own objects.
// 		//instead splitting on closing tag then adding that back in.
// 		var svgArray = svgCache.split( '</svg>' );

// 		//there will always be an extra element at the end -- string will end
// 		//in </svg>, and so an extra blank element is added. Hence loop test uses "-1"
// 		for ( var i = 0; i < svgArray.length-1; i++ ){

// 			var svgXML = svgArray[i].toString() + '</svg>';
// 			var svgDom = GXml.parse( svgXML );
// 			var styleValue = svgDom.documentElement.getAttribute( "style" )
// 			insertGifsForPrinting( svgXML, styleValue );

// 		}

// 	}

// }
// function insertGifsForPrinting( svgString, styleValue ){

// 	var request = GXmlHttp.create();
// 	var result;
// 	request.open( 'POST', 'parseSvg.pl', true );
// 	request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
// 	request.onreadystatechange = function() {
// 		if ( request.readyState == 4 ) {
// 			drawSvgAnalogue( request.responseText, styleValue );
// 		}
// 	}
// 	request.send( 'svg=' + escape( svgString ) );

// }
function drawSvgAnalogue( parseSvgResponse, styleValue ){

	//parseSvgResponse will be in form: CGISESSID=xxx&id=yyy -- seession id must be passed in queryString
	//since this is an ajax call rather than traditional browser conversation
	svgParent.innerHTML += '<img src="parseSvg.pl?' + parseSvgResponse + '" style="' + styleValue + '">';

}
function printDone(){

	document.getElementById("printDone").style.display = 'none';
	document.getElementById("searchBox").style.display = 'block';
	document.getElementById("copy").style.display = 'block';

	document.getElementById("mapPane").style.left = '30%';
	document.getElementById("mapPane").style.width = '70%';
	document.getElementById("mapPane").style.height = '96%';

	if ( ( typeof( svgCache ) != 'undefined' ) && ( svgCache.length > 0 ) ) {
		svgParent.innerHTML = '';
		svgCache = '';
		drawPolyLine(gLatLngArray);
	}

}
function getElevation(gLatLng,currentPointCoord) {

	if (elevationArray[currentPointCoord] == ELEVATION_UNLOOKEDUP){

		elevationArray[currentPointCoord] = ELEVATION_LOOKEDUP_NOT_YET_RETURNED;

		//getElevation looks up a point and adds it to an array of elevations.
		//it comtains no logic to decide whether or not to do the lookup, calling code should handle that
		$.ajax({
			url: 'getElevation.php?x=' + gLatLng.lng() + '&y=' + gLatLng.lat()
		}).done(function( data ) {
				addElevation( data, currentPointCoord );
			});

	}

}
function addElevationValueToArray(newElevation,currentPointCoord){

	if (newElevation == ELEVATION_UNLOOKEDUP){

		elevationArray[currentPointCoord] = null;

	} else {

		elevationArray[currentPointCoord] = parseInt(newElevation*100)/100;

	}

}
function addElevation(newElevation,currentPointCoord){

	numberOfFoundElevations++;

	//gisdata.usgs.net returns this value when there is a problem on their side
	//set  performElevationLookup so that subsequent lookups are not attempted
	if (newElevation == "-32768")  {

		bShowRefreshLink = true;
		newElevation = "0";
		//performElevationLookup = false;

	}

	var newElevationInFeet = parseFloat(newElevation) * 3.2808399;

	elevationArray[currentPointCoord] = parseInt(newElevationInFeet*100)/100;

	//elevGraphqString has page scope so it will still be available outside this function in case we need to redraw
	//graph when that pane is resized
	//elevGraphqString = '';

	//drawElevGraphQString();

	drawElevationGraph();

}
function getPixelsPerUnit(){

	if (getCurrentUnits()==METRIC) {

		return '62';

	} else {

		return '100';

	}

}
function drawElevGraphHtml(elevGraphqString){

	var sReturnVal
	var fMaxElev = 0;
	var fMinElev = 0;
	var fStartElev = 0;

	sReturnVal = '';
	//string is in form: 0,110;.75,100;.85,110;1.1,85 -- distances followed by elevations
	var elevGraphStrObj = new String(elevGraphqString);
	var elevGraphArr = elevGraphStrObj.split(";");

	var STEP_SIZE = 50;
	var sCurrentElevations;
	var aElevChunks = new Array(0);

	CurrentElevations = '';

	for (var i=0; i<elevGraphArr.length;i++){

		var sEntry = new String(elevGraphArr[i]);
		var aEntry = sEntry.split(",");
		var fCurrentElevation = parseFloat(aEntry[1]);

		if (i==0){

			fMaxElev = fCurrentElevation;
			fMinElev = fCurrentElevation;
			fStartElev = fCurrentElevation;

		}

		if (fCurrentElevation > fMaxElev) {

			fMaxElev = fCurrentElevation;

		}

		if (fCurrentElevation < fMinElev) {

			fMinElev = fCurrentElevation;

		}

		CurrentElevations = CurrentElevations += roundToTwoDecimalPlaces(returnDistanceInChosenUnits(distancesArray[i+1])) + ',' + roundToTwoDecimalPlaces(returnSmallDistanceInChosenUnits(elevationArray[i])) + ';';

		if ((i == elevGraphArr.length-1) || ((i+1) % STEP_SIZE == 0)) {

			CurElevObj = new String(CurrentElevations);
			aElevChunks.push(CurElevObj.substr(0,CurElevObj.length-1));

			//put in code to trim off the semicolon here!!

		}

		//we want to have the point at each boundary repeated in the gif on both sides of the boundary
		//if we are at the boundary, and we know that we have at least two points left before the end,
		//reinitialize the CurrentElevations string, which eventually has the effect of creating a new elevChunk
		if ((i < elevGraphArr.length-2) && ((i+1) % STEP_SIZE == 0)) {

			CurrentElevations = roundToTwoDecimalPlaces(returnDistanceInChosenUnits(distancesArray[i+1])) + ',' + roundToTwoDecimalPlaces(returnSmallDistanceInChosenUnits(elevationArray[i])) + ';';

		}

	}
	var finalDistance = roundToTwoDecimalPlaces(returnDistanceInChosenUnits(distancesArray[distancesArray.length-1]));

	sReturnVal += '<div style="width:'+(getPixelsPerUnit()*finalDistance)+'px">';
	for (var j=0; j<aElevChunks.length;j++) {

		sReturnVal += '<img style="margin:0px" src="drawGraph.php?elevDist='+aElevChunks[j]+'&graphHeight='+currentElevationGraphHeight+'&pixelsPerUnit='+getPixelsPerUnit()+'&min='+fMinElev+'&max='+fMaxElev+'&start='+fStartElev+'&totalDistance='+finalDistance+'">';

	}
	sReturnVal += '</div>';


	return sReturnVal;

}
function drawElevationGraph(){

	var elevGraphqString = drawElevGraphQString();

	if ((elevationArray.length >= 2) && (!bAllElevationsWereZero)){

		if (numberOfFoundElevations == gLatLngArray.length){

//				document.getElementById("elevationChart").innerHTML= ((bShowRefreshLink)?REFRESH_LINK:"") + '<img style="margin:0px" src="drawGraph.php?elevDist='+elevGraphqString+'&graphHeight='+currentElevationGraphHeight+'&pixelsPerUnit='+getPixelsPerUnit()+'">';
			document.getElementById("elevationChart").innerHTML= ((bShowRefreshLink)?REFRESH_LINK:"") + drawElevGraphHtml(elevGraphqString);

		} else {

			iPercent = Math.round((numberOfFoundElevations / (gLatLngArray.length-1))*100);
			document.getElementById("elevationChart").innerHTML= '<span style="font-family:arial;font-size:10pt">Please wait, looking up elevations...'+iPercent+'%</span>';

		}

	} else {

		document.getElementById("elevationChart").innerHTML = NO_GRAPH_MESSAGE;

	}

}
function elevationSwitch(displayHeight){

	//used in querystring and to tell php how high to draw the graph
	currentElevationGraphHeight = displayHeight;

	if (displayHeight == 0){

		document.getElementById("elevationSwitch0").innerHTML = unlinkElevation0;
		document.getElementById("elevationSwitch100").innerHTML = linkElevation100;
		document.getElementById("elevationSwitch200").innerHTML = linkElevation200;

		//document.getElementById("elevationChart").style.display = "none";
		//document.getElementById("elevationChart").style.height = displayHeight+"px";
		//document.getElementById("map").style.height = mapHeight+"px";

	} else if (displayHeight == 100){

		document.getElementById("elevationSwitch0").innerHTML = linkElevation0;
		document.getElementById("elevationSwitch100").innerHTML = unlinkElevation100;
		document.getElementById("elevationSwitch200").innerHTML = linkElevation200;

		//document.getElementById("elevationChart").style.display = "block";
		//document.getElementById("elevationChart").style.height = displayHeight+"px";
		//document.getElementById("map").style.height = (mapHeight-100)+"px";

	} else if (displayHeight == 200){

		document.getElementById("elevationSwitch0").innerHTML = linkElevation0;
		document.getElementById("elevationSwitch100").innerHTML = linkElevation100;
		document.getElementById("elevationSwitch200").innerHTML = unlinkElevation200;

		//document.getElementById("elevationChart").style.display = "block";
		//document.getElementById("elevationChart").style.height = displayHeight+"px";
		//document.getElementById("map").style.height = (mapHeight-200)+"px";

	}

	if ((displayHeight == 100) || (displayHeight == 200)){

		//set this to execute in one millisecond, so that IE immediately redraws
		//the elevation div, rather than waiting until after the graph is complete
		window.setTimeout('getElevationsAndDrawGraph()', 1);
		$('#elevationChart').css( 'display', 'block');

	}

	$('#elevationChart').animate({ height: displayHeight }, 500, setElevationVisibility( displayHeight )  );

}

function setElevationVisibility( displayHeight )
{
	//Can't just check for 0px -- IE resets height to 16px due to the default text inside the div. Feh.
	//98 rather than 100 due to two pixels worth of border
	if ( displayHeight == 0 )
	{
		setBorder( '#elevationChart', '0px' );
		$('#elevationChart').css( 'display', 'none');
	}
	else
	{
		setBorder( '#elevationChart', '1px solid black' );
	}

}

function setBorder( selectorString, borderString )
{
	//jquery address each side of a border individually. this function saves a few lines when turning on/off borders.
	$( selectorString ).css( 'border-left', borderString );
	$( selectorString ).css( 'border-right', borderString );
	$( selectorString ).css( 'border-top', borderString );
	$( selectorString ).css( 'border-bottom', borderString );
}

function refreshGraph(){

	bShowRefreshLink = false;
	numberOfFoundElevations = 0;
	performElevationLookup = false;

	getElevationsUponGraphSelect();

}
function getElevationsAndDrawGraph(){

	getElevationsUponGraphSelect();
	drawElevationGraph();

}
function getElevationsUponGraphSelect(){

	//this function is called from elevationSwitch, which handles
	//the case where a user has chosen to turn on the elevation graph.
	//The elevGraphqString may or may not have been populated -- if it
	//has not been, create it now.

	numberOfFoundElevations=0;

	for (var i=0; i<gLatLngArray.length; i++) {

		bAllElevationsFound = false;

		if (elevationArray[i]==ELEVATION_UNLOOKEDUP){

			getElevation(gLatLngArray[i],i);

		} else if ( elevationArray[i]==ELEVATION_LOOKEDUP_NOT_YET_RETURNED ) {

			//do nothing

		} else {

			numberOfFoundElevations++;

		}

	}
	bAllElevationsFound = true;

}
function createElevationQueryString(){

	var elevStrForUrl = '';

	for (var i =0;i<elevationArray.length;i++){

		elevStrForUrl += Math.round(elevationArray[i]*100);

		if (i < elevationArray.length-1) {

			elevStrForUrl += 'b';

		}

	}

	//good place for a comment. this parameter holds three pieces of information, delimited by "a":
	//
	//elevation_graph_height: the size in pixels that the graph should be sized
	//perform_lookup: this is obsolete, which is why there is now a hardcoded "a1a" in the middle there.
	//	it is obsolete because I later decided to have the decision about whether to look up an elevation be
	//	be determined by whether the graph is showing, which is determined by elevation_graph_height
	//elevations: a list of elevations for each point in the route. it is delimited by "b"
	//
	//valid example: "100a1a125.23b130.00b141.44"

	//var sPerformElevLookup = (performElevationLookup)?"1":"0";
	var sPerformElevLookup = "1";

	return currentElevationGraphHeight + 'a' + sPerformElevLookup + 'a' + elevStrForUrl;

}
function drawElevGraphQString(){

	var elevGraphqString = '';

	for (i=0; i < elevationArray.length;i++){

		elevGraphqString += roundToTwoDecimalPlaces(returnDistanceInChosenUnits(distancesArray[i+1])) + ',' + roundToTwoDecimalPlaces(returnSmallDistanceInChosenUnits(elevationArray[i])) + ';';

		if ( ( elevationArray[i] != ELEVATION_LOOKEDUP_NOT_YET_RETURNED ) && ( elevationArray[i] != ELEVATION_UNLOOKEDUP ) ){

			bAllElevationsWereZero = false;

		}

	}

	var qStringObj = new String(elevGraphqString);
	return qStringObj.substring(0,qStringObj.length-1);

}
function saveUnsavedChanges(){

	if ( routeSaved == false ) {

		if ( isAutoSaveEnabled() ) {

			var saveChosen = confirm( "Your route has unsaved changes. Click OK to save, or cancel to continue without saving." )

			if ( saveChosen ){

				synchronousSave();

			}

		}

	}

}
function synchronousSave() {

	$.ajax({
		url: 'saveRoute.php',
		type: 'POST',
		data: returnPermalinkString(),
		success: function( myData )
		{
			setCookie( 'lastRid', rId, 365 );
		}
	});

}
function getCookie( paramToGet ){

	var result = '';

	var paramArray = document.cookie.split( ';' );
	for ( var i = 0; i < paramArray.length; i++ ){

		if ( paramArray[i].indexOf( paramToGet+'=' ) > -1 ) {

			result = paramArray[i].substr( paramArray[i].indexOf( '=' ) + 1 );
			break;

		}

	}

	return result;

}
function setCookie( name, value, expiratioInDays ){

	var cookiePayload = name + '=' + value + ';';

	var expirationParam
	if ( expiratioInDays != 0 ) {

		var MILLISECONDS_PER_DAY = 86400000;
		var dateObj = new Date();
		dateObj.setTime( dateObj.setTime( dateObj.getTime() + ( expiratioInDays * MILLISECONDS_PER_DAY ) ) );
		cookiePayload += "expires=" + dateObj.toGMTString() + ";";
	}

	cookiePayload += "path=/";
	document.cookie = cookiePayload;

}
function drawAutosaveMessage() {

	var cookieContents = getCookie( 'lastRid' );

	if ( isAutoSaveEnabled() ) {

		if ( cookieContents != '0' ) {

			document.getElementById( 'autoSaveMessage' ).innerHTML = '<a href="?r=' + cookieContents + '">Click here</a> to reload route ' + cookieContents + '.';

		}

	}

}
function clearAutoSaveMessage(){

	//document.getElementById( 'autoSaveMessage' ).innerHTML = '';

}
function isAutoSaveEnabled(){

	var cookieContents = getCookie( 'lastRid' );
	return (cookieContents.length > 0);

}
var debugWin;
function debugIt(message){

	if (!debugWin){
		debugWin = window.open('','','');
	}
	debugWin.document.write(message+'<br>');

}
function debugItNoHr(message){

	if (!debugWin){
		debugWin = window.open('','','');
	}
	debugWin.document.write(message);

}
function svgon(){

	_mSvgEnabled = true;
	_mSvgForced  = true;

};
//functions to hide the control box
function hideControlBox()
{
	$('#copy').before('<span id="zoomLink" class="plain"><a href="javascript:showControlBox();">zoom open</a></span>');
	$('#zoomLink').height( $('#controls').height() );
	$('#zoomLink').width( $('#controls').width() );
	$('#controls').animate({ opacity: '0' }, 250, shrinkControlBoxParts );
}
function shrinkControlBoxParts()
{
	//$('#controls').css( 'visibility', 'hidden' );
	//$('#copy').css( 'visibility', 'hidden' )
	$('#controls').css( 'display', 'none' );
	$('#copy').css( 'display', 'none' )

	$('#zoomLink').css( 'display', 'block' )

	$('#zoomLink').animate({ height: '25', width: '100' }, 500 )
}
//functions to show the control box
function showControlBox()
{
	var newHeight = $('#controls').height();
	var newWidth = $('#controls').width();
	$('#zoomLink').animate({ height: newHeight, width: newWidth }, 500, showControlBoxParts )

}
function showControlBoxParts()
{
	$('#zoomLink').remove();

	//$('#copy').css( 'visibility', 'visible' );
	//$('#controls').css( 'visibility', 'visible' );
	$('#copy').css( 'display', 'block' );
	$('#controls').css( 'display', 'block' );

	$('#controls').css( 'opacity', '100' );
}
function scrollMap()
{
	resizeMap();
}
function expandMap() {
	//$( '#map' ).height( $( '#map' ).height()+149 );
	$( '#map' ).animate( { height: $( '#map' ).height()+149 } );
	$( '#mapPane' ).height( $( '#mapPane' ).height()+149 );
	$( '#moremaplink' ).text( 're-shrink map' );
	$( '#moremaplink' )[0].href='javascript:shrinkMap();';
	var selector = ( $.browser.msie || $.browser.webkit ) ? "body" : "html";
	//$( selector ).animate({ scrollTop: 149 }, 500  );

	map.checkResize();
}
function shrinkMap() {
	$( '#moremaplink' ).text( 'click here to expand map' );
	$( '#moremaplink' )[0].href='javascript:expandMap();';
	var selector = ( $.browser.msie || $.browser.webkit ) ? "body" : "html";
	//$( selector ).animate({ scrollTop: 0 }, 500, function(){
	//$( '#map' ).height( $( '#map' ).height()-149 );
	$( '#map' ).animate( { height: $( '#map' ).height()-149 } );
	$( '#map' ).height( $( '#map' ).height()-149 );
	$( '#mapPane' ).height( $( '#mapPane' ).height()-149 );
	map.checkResize();
	//}  );

}
function loadAds()
{
	function showSingleAd( remainingWidth, adDivName ){

		$( "#" + adDivName ).show();

		remainingWidth -= $( "#" + adDivName ).width();

		return remainingWidth;
	}

	var LEADERBOARD_WIDTH = 768;
	var BANNER_WIDTH = 468;
	var HALF_BANNER_WIDTH = 234;

	var pageWidth = $( 'body' ).width();
	var remainingWidth = pageWidth - LEADERBOARD_WIDTH;

	//show biggest ad on the left that room permits
	if ( remainingWidth >= LEADERBOARD_WIDTH ){

		remainingWidth = showSingleAd( remainingWidth, "mmLeaderboardLeft" );

		// } else if ( remainingWidth >= BANNER_WIDTH ) {

		// 	remainingWidth = showSingleAd( remainingWidth, "mmBannerLeft" );

	} else if ( remainingWidth >= HALF_BANNER_WIDTH ) {

		remainingWidth = showSingleAd( remainingWidth, "mmHalfBannerLeft" );

	}

	//ah wut the fuck, there's enough room for another half banner, stick one in.
	//we know it's safe to re-use half banner because there's no way we could have a half-banner-width's worth
	//of space left after having shown half banner already. Same not necessarily true of banner or leaderboard.
	// if ( remainingWidth >= HALF_BANNER_WIDTH + 100 ){

	// 	$( "#mmHalfBannerLeft" ).css( "left", "auto" );
	// 	$( "#mmHalfBannerLeft" ).css( "right", ( $( "#mmLeaderboardRight" ).width() + 50 ) + "px" );
	// 	$( "#mmHalfBannerLeft" ).show();

	// }
	//if we're here then one of the following has happenend:
	//-a full banner has shown on left. In which case there could be spavce left over for a half banner
	//-there was not enough room for a full banner, and a half was shown meaning by definition there won't be space left for anything else
	//-there was not enough space for a half banner either, so there will be less than a half banner width
	//basically only case where conditional below is true is first case, if we have enough room left over for a half banner, with 50px buffer on each side
	// if ( remainingWidth >= ( HALF_BANNER_WIDTH + 100 )  )
	// {
	// 	$( "#mmHalfBanner2" ).show();
	// 	$( "#mmHalfBanner2" ).css( "left", "518px" ); //518 = 468(width of full banner) + 50
	// }

}