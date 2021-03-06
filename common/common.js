View = function(){};   // the View namespace
var currentLanguage = "";  // language that is currently being translated
var isDirty = false;       // has user made any changes that need to be saved?

var localeToHumanReadableLanguageMap = {
	"en_US":"English (US)",
	"zh_TW":"Chinese - Traditional",
	"zh_CN":"Chinese - Simplified",
	"nl":"Dutch",
	"he":"Hebrew",
	"it":"Italian",
	"ja":"Japanese",
	"ko":"Korean"
};

// given locale (e.g. "ja"), returns human readable language (e.g. "Japanese")
function localeToHumanReadableLanguage(locale) {
	return localeToHumanReadableLanguageMap[locale];
};


// extension to String prototype
String.prototype.endsWith = function(suffix) {
	return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

/**
* Display the contents of the ui-html_XX.properties or i18n_XX.json file in a textarea
*/
function dump(translationString) {
	$("#dumpTextarea").html(translationString);
	$("#dumpDiv").show();
};

// toggle show/hide rows that have already been translated
function onlyShowMissingTranslation() {
	if($("#onlyShowMissingTranslationInput:checked").length == 1) {
		$("tr textarea").each(function() {if ($(this).val() != "") { $(this).parents(".translationRow").hide()}});
	} else {
		$("tr textarea").each(function() {if ($(this).val() != "") { $(this).parents(".translationRow").show()}});
	}
};

function updateMissingTranslationsCount() {
	var numMissingTranslations = 0;
	$("tr textarea:empty").each(function() {
		if ($(this).val() == "") {
			// have to do this double check because textarea that was just edited will still be selected by the "tr textarea:empty" selector
			numMissingTranslations += 1;
		}
	});
	$("#numMissingTranslations").html("("+numMissingTranslations+")");
};

/**
* Tries to save translation string (json string or properties string) to server.
* If unsuccessful, displays the string in textarea.
*/ 
function save(projectType) {
	isDirty = false;  // assume that user does the right thing and saves changes.
	$("#saveButton").attr("disabled","disabled");   // disable multiple saving
	$("#loadingGif").show();   // show the spinning wheel.
	var translationString = getTranslationString(View.prototype.i18n[currentLanguage]);
	dump(translationString);   // dump the translation file to the textarea so user can make backup.
	$("#saveButton").removeAttr("disabled");
	$("#loadingGif").hide();   // hide the spinning wheel.	
	$.ajax({
		url:"../common/post.php",
		type:"POST",
		data:{locale:currentLanguage,postStr:translationString,projectType:projectType},
		success:function(data, textStatus, jq) {
		},
		error:function() {
		}
	});
};


/**
 * Registers new i18n prototype to VLEView
 */
View.prototype.i18n = {
		locales:[]
};

/**
 * Returns translated value of the given key.
 * Uses locale that was specified in config. To specify
 * locale, use View.prototype.i18n.getString(key,locale) directly instead.
 * @param key
 * @return
 */
View.prototype.getI18NString = function(key) {
	return this.i18n.getString(key,this.config.getConfigParam("locale"));	
};

/**
 * Injects provided params into the translated string
 * key is the key used to lookup the value in i18n_XX.js file
 * params is an array of values to replace in the translated string.
 * the translated string should have the same number of replaceable elements as in the params
 * ex. params: ['goodbye', 'hello']
 * translated string: 'You say {0}, I say {1}'
 * 
 * Uses locale that was specified in config. To specify
 * locale, use View.prototype.i18n.getStringWithParam(key,locale,params) directly instead.
 */
View.prototype.getStringWithParams = function(key,params) {
	return this.i18n.getStringWithParams(key,this.config.getConfigParam("locale"),params);		
};

View.prototype.i18n.defaultLocale = "en_US";

/**
 * key is the key used to lookup the value in the key-value pair mpaaing
 * locale is which locale to use. will be appended in i18n_[locale].js
 * if local does not exist, use defaultLocale
 * if key is not found, use defaultLocale's values
 */
View.prototype.i18n.getString = function(key,locale) {
	// if specified locale does not exist, use default locale
	if (View.prototype.i18n.supportedLocales.indexOf(locale) == -1) {
		locale = View.prototype.i18n.defaultLocale;
	}
	if (this[locale][key] !== undefined) {
		return this[locale][key].value;
	} else {
		return this[View.prototype.i18n.defaultLocale][key].value;		
	}
};


/**
 * Injects provided params into the translated string
 * key is the key used to lookup the value in i18n_XX.js file
 * locale is which locale to use. will be appended in i18n_[locale].js
 * params is an array of values to replace in the translated string.
 * the translated string should have the same number of replaceable elements as in the params
 * ex. params: ['goodbye', 'hello']
 * translated string: 'You say {0}, I say {1}'
 * if local does not exist, use defaultLocale
 * if key is not found, use defaultLocale's values
 */
View.prototype.i18n.getStringWithParams = function(key,locale,params) {
	// first get translated string
	var translatedString = this.getString(key,locale);
	
	// then go through the string and replace {0} with paramas[0], {1} with params[1], etc.
	for (var i=0; i< params.length; i++) {
		var lookupString = "{"+i+"}";
		var replaceString = params[i];
		translatedString = translatedString.replace(lookupString,replaceString);
	}
	return translatedString;
};

/**
 *  retrieve i18n file based on VLE config. 
 *  first retrieves default locale and then retrieves user's locale.
 */
View.prototype.retrieveLocales = function() {
	// retrieve default locale
	this.retrieveLocale(View.prototype.i18n.defaultLocale);
	
        var userLocale = "en_US";
	// retrieve user locale, if exists
        if (this.config != null && this.config.getConfigParam("locale")) {
	  userLocale = this.config.getConfigParam("locale");		
        }
	if (userLocale != View.prototype.i18n.defaultLocale) {
		for (var i=0; i < View.prototype.i18n.supportedLocales.length; i++) {
			var locale = View.prototype.i18n.supportedLocales[i];
			if (locale == userLocale) {
				View.prototype.i18n[locale] = {};
				this.retrieveLocale(locale);
			}
		};
	};
};

$(document).ready(function() {  
	// add supported locales to selectable drop-down list
	for (var i=0; i<View.prototype.i18n.supportedLocales.length; i++) { 
		var supportedLocale = View.prototype.i18n.supportedLocales[i];
		if (supportedLocale != "en_US") {
			$("#currentLanguageSelect").append("<option id='"+supportedLocale+"' value='"+supportedLocale+"'>"+localeToHumanReadableLanguage(supportedLocale)+" ("+supportedLocale+") "+"</option");
		}
	}

	// print default and supported locales
	$("#defaultLocale").append(View.prototype.i18n.defaultLocale + " (" + localeToHumanReadableLanguage(View.prototype.i18n.defaultLocale) + ")");
	// fetch translation files for all supported locales and set them to View.prototype.i18n[locale] array
	for (var i=0; i < View.prototype.i18n.supportedLocales.length; i++) {
		var locale = View.prototype.i18n.supportedLocales[i];
		View.prototype.i18n[locale] = {};
		View.prototype.retrieveLocale(locale);
	};

	$("#currentLanguageSelect").change(function() {
		// user changed currentLanguage, so we need to build and display the table
		currentLanguage = $(this).find(":selected").val()
		buildTable();
	});
});

window.onbeforeunload = function() {
	// before user navigates away from the page or refreshes it, check to see if user needs to save changes or not
	if (isDirty) {
		// this will ensure that the user sees an "Are you sure? Unsaved things will be deleted" message
		return false;
	}
};

