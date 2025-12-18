sap.ui.define([
	"sap/dm/dme/podfoundation/component/production/ProductionUIComponent",
	"sap/ui/Device"
], function (ProductionUIComponent, Device) {
	"use strict";

	return ProductionUIComponent.extend("abb.views.custom.customSignOffPlugin.customSignOffPlugin.Component", {
		metadata: {
			manifest: "json"
		}
	});
});