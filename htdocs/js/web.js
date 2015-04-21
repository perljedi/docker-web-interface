$(document).ready(function(){
	var dopplerStorage = $.dopplerStorage || {};
	$.dopplerStorage = dopplerStorage;
	$.extend(dopplerStorage, {
		initPage: function(){
			dopplerStorage.bindPageEvents();
			dopplerStorage.initTemplates();
			dopplerStorage.updateFoci();
			$("#modalDialog").dialog({autoOpen:false});
			setInterval(dopplerStorage.update_observers, 5000);
			dopplerStorage.update_observers();
			dopplerStorage.getGroups();
			dopplerStorage.getFocusTypes();
			$("#focus_table").DataTable();
			$("#group_table").DataTable();
		},
		initTemplates: function(){
			dopplerStorage.foci_template = _.template($("#foci_template").html());
			dopplerStorage.observer_template=_.template($("#observer_template").html());
			dopplerStorage.observation_tempalte = _.template($("#observation_template").html());
			dopplerStorage.group_template=_.template($("#group_template").html());
			dopplerStorage.select_group_template=_.template($("#select_group_template").html());
			dopplerStorage.add_group_template = _.template($("#add_group_template").html());
			dopplerStorage.focus_param_template = _.template($("#focus_param_template").html());
		},
		bindPageEvents: function(){
			$(document).on("click", ".focus_id", function(e){
				var id = $(this).data("id");
				$.getJSON("http://localhost:5000/focus/"+id+"/observation", function(res){
					res.focus_id = id;
					var $content = $(dopplerStorage.observation_tempalte(res));
					$.featherlight($content);
					$(".featherlight-content .observations").DataTable({ "lengthMenu": [[5,  10, 25, 50, -1], [5, 10, 25, 50, "All"]] });
				});
			});
			$(document).on("click", ".remove-focus-group", function(e){
				var $button = $(this);
				var focus_id = $button.data("focus");
				var group_id = $button.data("group");
				$.ajax({
					url:"http://localhost:5000/focus/"+focus_id+"/"+group_id,
					method: "DELETE",
					success:function(res){
						$button.closest("tr").remove();
					}
				});
			});
			$(document).on("click", ".add-focus-group", function(e){
				var $button = $(this);
				var focus_id = $button.data("focus");
				$.getJSON("http://localhost:5000/group", function(res){
					res.focus_id = focus_id;
					$("#modalDialog").html(dopplerStorage.add_group_template(res));
					$("#add_group_select").selectmenu();
					$("#modalDialog").dialog({
						title:"Add Group",
						width:600,
						dialogClass: "ui-dialog",
						buttons:[
							{text:"Add", click:dopplerStorage.addFocusGroup},
							{text:"Cancel", click:function(){$(this).dialog("close");}}
						]
					});
					$("#modalDialog").dialog("open");
				});
				
			});
			$(".tabs").tabs();
			$(".control_button").button();
			$("#add_group_button").on("click", function(){
				$("#add_group_div").show();
			});
			$("#cancel_add_group").on("click", function(){
				$("#add_group_div").hide();
			});
			$("#create_group").on("click", function(){
				var new_group = {
					name: $("#group_name").val(),
					description: $("#group_description").val()
				};
				$.ajax({
					url: "http://localhost:5000/group",
					method: "POST",
					data:JSON.stringify(new_group),
					success: function(){
						$("#add_group_div").hide();
						dopplerStorage.getGroups();
					},
					error: function(http, status, message){
						$("#modalDialog").empty();
						$("#modalDialog").append("<div><span class='ui-icon ui-icon-alert' style='float:left; margin-right:.3em;'></span>"+http.responseJSON.message+"</div>");
						$("#modalDialog").dialog({
							dialogClass:"ui-state-error",
							title:"Error",
							modal: true,
							width: 600,
							buttons:{"Ok":function(){$(this).dialog("close");}}
						});
						$("#modalDialog").dialog("open");
					}
				});
			});
			$("#add_focus_button").on("click", function(){
				$("#add_focus_div").show();
			});
			$("#cancel_add_focus").on("click", function(){
				$("#add_focus_div").hide();
			});
			$("#create_focus").on("click", function(){
				
				$.ajax({
					url:"http://localhost:5000/focus",
					method: "POST",
					contentType: false,
					data: JSON.stringify(dopplerStorage.buildFocusParameters()),
					success: function(res){
						dopplerStorage.updateFoci();
					},
					error: function(http, status, message){
						$("#modalDialog").empty();
						$("#modalDialog").append("<div><span class='ui-icon ui-icon-alert' style='float:left; margin-right:.3em;'></span>"+http.responseJSON.message+"</div>");
						$("#modalDialog").dialog({
							dialogClass:"ui-state-error",
							title:"Error",
							modal: true,
							width: 600,
							buttons:{"Ok":function(){$(this).dialog("close");}}
						});
						$("#modalDialog").dialog("open");}
					});
				$("#add_focus_div").hide();
			});
		},
		buildFocusParameters: function(){
			var params = {
				type: $("#focus_type").val(),
				groups: _.map($("#focus_groups input:checked"), function(input){ return $(input).val() }),
			};
			_.forEach($("#focus_parameters :input"), function(elem){
				var $inp = $(elem);
				var name = $inp.prop("name");
				params[$(elem).prop("name")] = $(elem).val();
			});
			return params;
		},
		getFocusTypes: function(){
			$.getJSON("http://localhost:5000/focus_type", function(res){
				dopplerStorage.focus_types = res;
				_.forEach(_.sortBy(_.keys(dopplerStorage.focus_types), function(n){return n.toUpperCase()}), function(key){
					$("#focus_type").append($("<option>").text(key));
				});
				$("#focus_type").selectmenu({
					change: function(){
						$("#focus_parameters").empty();
						$("#focus_parameters").append(dopplerStorage.focus_param_template({parameters:dopplerStorage.focus_types[$("#focus_type").val()]}));
					}
				});
			});
		},
		getGroups: 	function () {
			$.getJSON("http://localhost:5000/group", function(res){
				$("#group_list").empty();
				$("#group_list").append(dopplerStorage.group_template(res));
				$("#focus_groups").empty();
				$("#focus_groups").append(dopplerStorage.select_group_template(res));
				$("#focus_groups").buttonset({items:"input[type=checkbox]"});
			});
		},
		update_observers:     function (){
			$.getJSON("http://localhost:5000/observer", function(res){
				var obs = {};
				_.forEach(res.observers, function(observer){
					obs[observer.id] = 1;
					if ($("#"+observer.id).length) {
						$("#"+observer.id).replaceWith(dopplerStorage.observer_template({observer:observer}));
						$("#"+observer.id).effect("highlight");
					}else{
						$("#observer_list").append(dopplerStorage.observer_template({observer:observer}));
					}
				});
				$(".observer_record").each(function(){
					if (! obs[$(this).prop("id")]) {
						$(this).remove();
					}
				});
				$("#observer_table").DataTable();
			});
		},
		addFocusGroup: function(){
			$.ajax({
				url:"http://localhost:5000/focus/"+$("#add_focus_group_target").val()+"/"+$("#add_group_select").val(),
				method: "POST",
				data:{},
				success:function(){
					dopplerStorage.updateFoci();
					$("#modalDialog").dialog("close");
				},
				error: function(http, status, message){
					$("#modalDialog").empty();
					$("#modalDialog").append("<div><span class='ui-icon ui-icon-alert' style='float:left; margin-right:.3em;'></span>"+http.responseJSON.message+"</div>");
					$("#modalDialog").dialog({
						dialogClass:"ui-state-error",
						title:"Error",
						modal: true,
						width: 600,
						buttons:{"Ok":function(){$(this).dialog("close");}}
					});
					$("#modalDialog").dialog("open");
				}
			});
		},
		updateFoci: function(){
			$.getJSON("http://localhost:5000/focus?deleted=0", function(res){
				$("#foci_list").empty();
				var htmstr = dopplerStorage.foci_template(res);
				$("#foci_list").append(htmstr);
				$("#foci_list button").button();
			});
		},
	});
	dopplerStorage.initPage();
});
