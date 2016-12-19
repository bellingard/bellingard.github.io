
// OLD script below
/*
function addLoadListener(fn)
{
	if (typeof window.addEventListener != 'undefined')
	{
	window.addEventListener('load', fn, false);
}
else if (typeof document.addEventListener != 'undefined')
{
	document.addEventListener('load', fn, false);
}
else if (typeof window.attachEvent != 'undefined')
{
	window.attachEvent('onload', fn);
}
else
{
	var oldfn = window.onload;
	if (typeof window.onload != 'function')
	{
	window.onload = fn;
	}
	else
	{
	window.onload = function()
	{
	oldfn();
	fn();
	};
	}
	}
}

addLoadListener(searchBox)

function searchBox() {

var mySearchBox = document.getElementById("s");
var mySearchBoxValue = document.getElementById("s").value;

	if (mySearchBox.value == '') {
		mySearchBox.value = "Search";
		mySearchBoxValue = "Search";
	}
	
	mySearchBox.onfocus = function() {
		if (mySearchBox.value == mySearchBoxValue || mySearchBox.value == 'Search')
			mySearchBox.value = "";
	}
	
	mySearchBox.onblur = function() {
		if (mySearchBox.value == '')
			mySearchBox.value = mySearchBoxValue;
	}

}
*/
