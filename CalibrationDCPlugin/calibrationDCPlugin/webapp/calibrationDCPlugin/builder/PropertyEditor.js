sap.ui.define([
    "sap/ui/model/resource/ResourceModel",
    "sap/dm/dme/podfoundation/control/PropertyEditor"
], function (ResourceModel, PropertyEditor) {
    "use strict";
    
    var oFormContainer;

    return PropertyEditor.extend( "abb.views.calibrationDC.calibrationDCPlugin.calibrationDCPlugin.builder.PropertyEditor" ,{

		constructor: function(sId, mSettings){
			PropertyEditor.apply(this, arguments);
			
			this.setI18nKeyPrefix("customComponentListConfig.");
			this.setResourceBundleName("abb.views.calibrationDC.calibrationDCPlugin.calibrationDCPlugin.i18n.builder");
			this.setPluginResourceBundleName("abb.views.calibrationDC.calibrationDCPlugin.calibrationDCPlugin.i18n.i18n");
		},
		
		addPropertyEditorContent: function(oPropertyFormContainer){
			var oData = this.getPropertyData();
			
			this.addSwitch(oPropertyFormContainer, "backButtonVisible", oData);
			this.addSwitch(oPropertyFormContainer, "closeButtonVisible", oData);
			this.addInputField(oPropertyFormContainer, "keyCheckSFCActive", oData);
			this.addInputField(oPropertyFormContainer, "keyCheckCaliDCIsConfig", oData);
			this.addInputField(oPropertyFormContainer, "keyGetDCHistorianData", oData);
			this.addInputField(oPropertyFormContainer, "keyLogDC", oData);
			this.addInputField(oPropertyFormContainer, "title", oData);
			this.addInputField(oPropertyFormContainer, "calibrationDCName", oData);
			this.addInputField(oPropertyFormContainer, "calibrationDCVersion", oData);
            oFormContainer = oPropertyFormContainer;
		},

		getTitle: function () {
            return this.getI18nText("title");
        },
		
		getDefaultPropertyData: function(){
			return {
				"backButtonVisible": true,
				"closeButtonVisible": true,
				"keyCheckSFCActive":"",
				"keyCheckCaliDCIsConfig":"",
				"keyGetDCHistorianData":"",
				"keyLogDC":"",
                "title": "Calibration DC",
				"calibrationDCName":"",
				"calibrationDCVersion":""
			};
		}

	});
});