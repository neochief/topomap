$(document).ready(function(){
	$('.close').click(function(){
		$('#info').toggleClass('opened');
		if ($('#info').is('.opened')) {
			$(this).text('↓');
		}
		else {
			$(this).text('↑');
		}
		return false;
	});
});