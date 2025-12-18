sap.ui.define([
	"sap/dm/dme/podfoundation/component/production/ProductionUIComponent",
	"sap/ui/Device"
], function (ProductionUIComponent, Device) {
	"use strict";

	return ProductionUIComponent.extend("abb.views.reprintTracableId.reprintTracableIdPlugin.reprintTracableIdPlugin.Component", {
		metadata: {
			manifest: "json"
		}
	});
});