sap.ui.define([
    "sap/ui/model/resource/ResourceModel",
    "sap/dm/dme/podfoundation/control/PropertyEditor"
], function (ResourceModel, PropertyEditor) {
    "use strict";
    
    var oFormContainer;

    return PropertyEditor.extend( "abb.views.reprintTracableId.reprintTracableIdPlugin.reprintTracableIdPlugin.builder.PropertyEditor" ,{

		constructor: function(sId, mSettings){
			PropertyEditor.apply(this, arguments);
			
			this.setI18nKeyPrefix("customComponentListConfig.");
			this.setResourceBundleName("abb.views.reprintTracableId.reprintTracableIdPlugin.reprintTracableIdPlugin.i18n.builder");
			this.setPluginResourceBundleName("abb.views.reprintTracableId.reprintTracableIdPlugin.reprintTracableIdPlugin.i18n.i18n");
		},
		
		addPropertyEditorContent: function(oPropertyFormContainer){
			var oData = this.getPropertyData();
			this.addSwitch(oPropertyFormContainer, "backButtonVisible", oData);
			this.addSwitch(oPropertyFormContainer, "closeButtonVisible", oData);
			this.addInputField(oPropertyFormContainer, "keyGetTraceIdCompData", oData);
			this.addInputField(oPropertyFormContainer, "title", oData);
            oFormContainer = oPropertyFormContainer;
		},
		
		getDefaultPropertyData: function(){
			return {
				"backButtonVisible": true,
				"closeButtonVisible": true,
				"keyGetTraceIdCompData":"",
                "title": "Re-Print Tracable ID"
			};
		}

	});
});