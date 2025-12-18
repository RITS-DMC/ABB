sap.ui.define([
    "sap/ui/model/resource/ResourceModel",
    "sap/dm/dme/podfoundation/control/PropertyEditor"
], function (ResourceModel, PropertyEditor) {
    "use strict";
    
    var oFormContainer;

    return PropertyEditor.extend( "abb.views.custom.customSignOffPlugin.customSignOffPlugin.builder.PropertyEditor" ,{

		constructor: function(sId, mSettings){
			PropertyEditor.apply(this, arguments);
			
			this.setI18nKeyPrefix("customComponentListConfig.");
			this.setResourceBundleName("abb.views.custom.customSignOffPlugin.customSignOffPlugin.i18n.builder");
			this.setPluginResourceBundleName("abb.views.custom.customSignOffPlugin.customSignOffPlugin.i18n.i18n");
		},
		
		addPropertyEditorContent: function(oPropertyFormContainer){
			var oData = this.getPropertyData();
			
			this.addSwitch(oPropertyFormContainer, "backButtonVisible", oData);
			this.addSwitch(oPropertyFormContainer, "closeButtonVisible", oData);
			this.addInputField(oPropertyFormContainer, "keyGetDCParameterData", oData);
			this.addInputField(oPropertyFormContainer, "keyLogDCAndSignoff", oData);
			this.addInputField(oPropertyFormContainer, "title", oData);
			this.addInputField(oPropertyFormContainer, "reasonCodeDCName", oData);
			this.addInputField(oPropertyFormContainer, "reasonCodeDCVersion", oData);
			this.addInputField(oPropertyFormContainer, "reasonCodeConfigurationDCName", oData);
            oFormContainer = oPropertyFormContainer;
		},
		
		getDefaultPropertyData: function(){
			return {
				"backButtonVisible": true,
				"closeButtonVisible": true,
				"keyGetDCParameterData":"",
				"keyLogDCAndSignoff":"",
                "title": "plugin.title",
				"reasonCodeDCName":"",
				"reasonCodeDCVersion":"",
				"reasonCodeConfigurationDCName":""
			};
		}

	});
});