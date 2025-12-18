sap.ui.define([
    "sap/ui/model/resource/ResourceModel",
    "sap/dm/dme/podfoundation/control/PropertyEditor"
], function (ResourceModel, PropertyEditor) {
    "use strict";
    
    var oFormContainer;

    return PropertyEditor.extend( "abb.views.reLogCompleteRC.reLogCompleteRCPlugin.reLogCompleteRCPlugin.builder.PropertyEditor" ,{

		constructor: function(sId, mSettings){
			PropertyEditor.apply(this, arguments);
			
			this.setI18nKeyPrefix("customComponentListConfig.");
			this.setResourceBundleName("abb.views.reLogCompleteRC.reLogCompleteRCPlugin.reLogCompleteRCPlugin.i18n.builder");
			this.setPluginResourceBundleName("abb.views.reLogCompleteRC.reLogCompleteRCPlugin.reLogCompleteRCPlugin.i18n.i18n");
		},
		
		addPropertyEditorContent: function(oPropertyFormContainer){
			var oData = this.getPropertyData();
			
			this.addSwitch(oPropertyFormContainer, "backButtonVisible", oData);
			this.addSwitch(oPropertyFormContainer, "closeButtonVisible", oData);
			this.addInputField(oPropertyFormContainer, "keyGetDCParameterData", oData);
			this.addInputField(oPropertyFormContainer, "keyGetDCHistorianData", oData);
			this.addInputField(oPropertyFormContainer, "keyLogDC", oData);
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
				"keyGetDCHistorianData":"",
				"keyLogDC":"",
                "title": "plugin.title",
				"reasonCodeDCName":"",
				"reasonCodeDCVersion":"",
				"reasonCodeConfigurationDCName":""
                
			};
		}

	});
});