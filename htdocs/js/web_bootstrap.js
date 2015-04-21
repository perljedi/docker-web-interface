$(document).ready(function(){
	var dopplerStorage = $.dopplerStorage || {};
	$.dopplerStorage = dopplerStorage;
	$.extend(dopplerStorage, {
		initPage: function(){
			$("#includeDeletedFoci").prop("checked", false);
			dopplerStorage.bindPageEvents();
			dopplerStorage.initTemplates();
			dopplerStorage.updateFoci();
			dopplerStorage.getGroups();
			dopplerStorage.getFocusTypes();
			//$('.selectpicker').selectpicker();
			dopplerStorage.focus_pages = [];
			setState();
		},
		initTemplates: function(){
			dopplerStorage.foci_template = _.template($("#foci_template").html());
			dopplerStorage.observer_template=_.template($("#observer_template").html());
			dopplerStorage.observation_tempalte = _.template($("#observation_template").html());
			dopplerStorage.group_template=_.template($("#group_template").html());
			dopplerStorage.select_group_template=_.template($("#select_group_template").html());
			dopplerStorage.add_group_template = _.template($("#add_group_template").html());
			dopplerStorage.focus_param_template = _.template($("#focus_param_template").html());
			dopplerStorage.group_focus_template = _.template($("#group_focus_template").html());
			dopplerStorage.bindDualListBox();
		},
		bindPageEvents: function(){
			window.addEventListener("resize", dopplerStorage.updateFociPanelSize);
			$(document.body).on("resize", dopplerStorage.updateFociPanelSize);
			$(document).on("click", ".groupDashboard", function(){
				var group = $(this).data("id");
				$("#groupFociModal .group-name").html($(this).data("name"));
				dopplerStorage.focus_timers = [];
				$.getJSON("http://"+location.hostname+":5000/group/"+group+"/focus?deleted=0", function(res){
					$("#groupFociModal .modal-body").html(dopplerStorage.group_focus_template(res));
					_.forEach(res.foci, function(focus){
						dopplerStorage.focus_timers.push(setInterval(function(){
							dopplerStorage.updateFociWidget(focus);
						}, 5000));
						dopplerStorage.updateFociWidget(focus);
					});
				});
			});
			$("#groupFociModal").on("hide.bs.modal", function(){
				_.forEach(dopplerStorage.focus_timers, function(timer){
					clearInterval(timer);
				});
			});
			$(document).on("change", "#includeDeletedFoci", function() {
				dopplerStorage.updateFoci();
			});
			$(document).on("click", ".deleteFocus", function(){
				var id=$(this).closest("tr").prop("id");
				$.ajax({
					url:"http://"+location.hostname+":5000/focus/"+id,
					method: "DELETE",
					data:{},
					success:function(){
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
						$("#modalDialog").dialog("open");
					}
				});
				
			});
			$("#create_focus").on("click", function(){
				$.ajax({
					url:"http://"+location.hostname+":5000/focus",
					method: "POST",
					contentType: false,
					data: JSON.stringify(dopplerStorage.buildFocusParameters()),
					success: function(res){
						dopplerStorage.updateFoci();
						$("#newFocusModal").modal("hide");
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
			$(document).on("click", ".observation-graph", function(e){
				var id = $(this).data("id");
				$("#observation_focus_id").val(id);
				dopplerStorage.showObservationsGraph(id);
			});
			$(document).on("click", ".focus-list", function(e){
				var id = $(this).data("id");
				$("#observation_focus_id").val(id);
				dopplerStorage.showObservationsList(id);
			});
			$(document).on("click", ".chartGroup", function(e){
				var id = $(this).data("id");
				$("#observation_group_id").val(id);
				dopplerStorage.showGroupObservationChart(id);
			});
			$(document).on("click", ".remove-focus-group", function(e){
				var $button = $(this);
				var focus_id = $button.data("focus");
				var group_id = $button.data("group");
				$.ajax({
					url:"http://"+location.hostname+":5000/focus/"+focus_id+"/"+group_id,
					method: "DELETE",
					success:function(res){
						$button.closest("tr").remove();
					}
				});
			});
			$("#addFocusGroupButton").on("click", dopplerStorage.addFocusGroup);
			$(document).on("click", ".add-focus-group", function(e){
				var $button = $(this);
				var focus_id = $button.data("focus");
				$.getJSON("http://"+location.hostname+":5000/group", function(res){
					res.focus_id = focus_id;
					$("#addGroups").html(dopplerStorage.add_group_template(res));
					dopplerStorage.bootstrapSelect();
					$("#addGroupModal").modal("show");
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
					url: "http://"+location.hostname+":5000/group",
					method: "POST",
					data:JSON.stringify(new_group),
					success: function(){
						$("#newGroupModal").modal("hide");
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
			$(".observer-tab").on('show.bs.tab', function(){
				dopplerStorage.update_observers();
			});
			$("#refresh_observers").on('click', function(){
				dopplerStorage.update_observers();
			});
			$("#refresh_foci").on('click', function(){
				dopplerStorage.updateFoci();
			});
			$(".radioLimitSelect a").on('click', function(){
			    var sel = $(this).data('title');
			    var tog = $(this).data('target');
			    $('#'+tog).prop('value', sel);
			    $('#'+tog).trigger("change");
			    $('a[data-target="'+tog+'"]').not('[data-title="'+sel+'"]').removeClass('active').addClass('notActive');
			    $('a[data-target="'+tog+'"][data-title="'+sel+'"]').removeClass('notActive').addClass('active');
			});
			$("#observations").on("change", function(){
				dopplerStorage.showObservationsGraph($("#observation_focus_id").val());
			});
			$("#group_observations").on("change", function(){
				dopplerStorage.showGroupObservationChart($("#observation_group_id").val());
			});
			$(document).on('click', "#list_records a", function(){
			    var sel = $(this).data('title');
			    var tog = $(this).data('toggle');
			    $('#'+tog).prop('value', sel);
			    
			    $('a[data-toggle="'+tog+'"]').not('[data-title="'+sel+'"]').removeClass('active').addClass('notActive');
			    $('a[data-toggle="'+tog+'"][data-title="'+sel+'"]').removeClass('notActive').addClass('active');
			    dopplerStorage.showObservationsList($("#observation_focus_id").val());
			});
			$("#focus_filters").on("show.bs.collapse", function(){
				console.log("here");
				$("#show_focus_filters").addClass("dropup");
			});
			$("#focus_filters").on("hide.bs.collapse", function(){
				$("#show_focus_filters").removeClass("dropup");
			});
			$(".pagination a.next_page").on("click", function(){
				dopplerStorage.updateFoci($(this).data("start-from"));
			});
			$(".pagination a.prev_page").on("click", function(){
				dopplerStorage.focus_pages.pop();
				dopplerStorage.updateFoci(dopplerStorage.focus_pages.pop());
			});
			$("#foci-per-page,#focus-type-filter").on("change", function(){
				dopplerStorage.updateFoci(dopplerStorage.focus_pages.pop());
			});
			$(document).on("click", "#seriesLegend .label", function(){
				var $target = $($(this).data("target"));
				if($target.css("display") == "inline"){
					$target.hide();
				}
				else {
					$target.show();
				}
			});
			$("#timelineModal").on("show.bs.modal", function(){
				dopplerStorage.graph_update_interval = setInterval(function(){
					dopplerStorage.showObservationsGraph($("#observation_focus_id").val());
				}, 60000);
			});
			$("#timelineModal").on("hide.bs.modal", function(){
				clearInterval(dopplerStorage.graph_update_interval);
			});
			$("#averageResponseTimes").on("change", function(){
				dopplerStorage.showObservationsGraph($("#observation_focus_id").val());
			});
		},
		updateFociWidget: function(focus){
			$.getJSON("http://"+location.hostname+":5000/focus/"+focus.id+"/observation?limit=1", function(res){
				$("#panel-"+focus.id+" .last-observed").html(new Date(Math.floor(res.observations[0].observation_begin * 1000)).toISOString());
				if(res.observations[0].success){
					$("#panel-"+focus.id).removeClass("panel-danger");
				}
				else {
					$("#panel-"+focus.id).addClass("panel-danger");
				}
			});
		},
		showObservationsGraph: function(id){
			var limit = $("#observations").val() * 12;
			//limit += 2;
			$.getJSON("http://"+location.hostname+":5000/focus/"+id+"/observation?limit="+limit, function(res){
				res.focus_id = id;
				$("#focusTimeline").empty();
				var width = 810/res.observations.length;
				dopplerStorage.buildTimelime(res.observations, "#focusResponseTime");
				_.forEach(res.observations, function(observation){
					
					var block = "<div style='width:"+width+"px;height:40px;background-color:";
					if (observation.success) {
						block = block + "green";
					}
					else {
						block = block + "red";
					}
					block = block + ";float:left;'></div>";
					$("#focusTimeline").append(block);
				});
				var $content = $(dopplerStorage.observation_tempalte(res));
				$("#data_tab").empty();
				$("#data_tab").html($content);
				$("#data_tab table").DataTable({ "order": [], "lengthMenu": [[5,  10, 25, 50, -1], [5, 10, 25, 50, "All"]] });
			});
		},
		showObservationsList: function(id){
			$.getJSON("http://"+location.hostname+":5000/focus/"+id+"/observation?limit=50", function(res){
				var $content = $(dopplerStorage.observation_tempalte(res));
                                $.featherlight($content);
                                $(".featherlight-content .observations").DataTable({ "order": [], "lengthMenu": [[5,  10, 25, 50, -1], [5, 10, 25, 50, "All"]] });
			});
		},
		buildTimelime: function(observations, target){
			$(target).empty();
			var graph = d3.select(target).append("svg:svg").attr("width", "100%").attr("height", "100%");
			var sum = 0;
			var points = [];
			var outliers = d3.extent(observations, function(d){ return d.observation_end - d.observation_begin });
			if ($("#averageResponseTimes").is(":checked")) {
				//var observats = observations.filter(function(d){var dur = d.observation_end - d.observation_begin; return dur != outliers[0] && dur != outliers[1]});
				for(var i=0; i<observations.length; i++){
					if (((i+1)%12) == 0) {
						var average = sum/12;
						points.push({duration:average, occured:new Date(Math.floor(observations[i].observation_begin * 1000))});
						sum = 0;
					}
					sum+=observations[i].observation_end - observations[i].observation_begin;
				}
			}
			else {
				for(var i=0; i<observations.length; i++){
					var dur = observations[i].observation_end - observations[i].observation_begin;
					//if (dur != outliers[0] && dur != outliers[1]) {
						points.push({duration:dur, occured:new Date(Math.floor(observations[i].observation_begin * 1000))});
					//}
				}
			}
			var median = d3.median(points, function(d){ return d.duration; });
			var mean = d3.mean(points, function(d){ return d.duration; });
			var deviation = d3.deviation(points, function(d){ return d.duration; });
			var variance = d3.variance(points, function(d){ return d.duration; });
			var upper_deviation = mean+deviation;
			var lower_deviation = mean-deviation;

			// X scale will fit values from 0-10 within pixels 0-100
			//var x = d3.scale.linear().domain([0,(limit/5)-1]).range([30, 625]);
			// Scale X as time
			console.log(d3.extent(d3.merge([points.map(function(d) { return d.duration; }),[upper_deviation,lower_deviation]])));
			var x = d3.time.scale().domain(d3.extent(points, function(d) { return d.occured; })).range([840, 30]);
			// Y scale will fit values from 0-10 within pixels 0-100
			var y = d3.scale.linear().domain(d3.extent(d3.merge([points.map(function(d) { return d.duration; }),[upper_deviation,lower_deviation]]))).range([330, 0]);
	
			// create a line object that represents the SVN line we're creating
			var line = d3.svg.line()
				// assign the X function to plot our line as we wish
				.x(function(d,i) { 
					// verbose logging to show what's actually being done
					//console.log('Plotting X value for data point: ' + d + ' using index: ' + i + ' to be at: ' + x(i) + ' using our xScale.');
					// return the X coordinate where we want to plot this datapoint
					return x(points[i].occured); 
				})
				.y(function(d,i) { 
					// verbose logging to show what's actually being done
					// return the Y coordinate where we want to plot this datapoint
					return y(points[i].duration); 
				});
			var yupper_deviation = y(mean+deviation);
			var ylower_deviation = y(mean-deviation);
			var ymedian = y(median);
			var ymean = y(mean);
			console.log("median: "+median);
			console.log("mean: "+mean);
			console.log("deviation: "+deviation);
			console.log("variance: "+variance);
			
			var area = d3.svg.area()
				.x(function(d) { return x(d.occured); })
				.y0(ylower_deviation)
				.y1(yupper_deviation);

			//.tickFormat(function(n){new Date(Math.floor(observations[n].observation_end * 1000)).toISOString()})
			xAxis = d3.svg.axis().scale(x).ticks(5).tickFormat(d3.time.format("%I:%M %p")).tickSize(-330).orient("bottom");;
			yAxis = d3.svg.axis().scale(y).ticks(4).tickSize(-810).orient("left");
			console.log("plotted "+points.length+" points");
			// display the line by appending an svg:path element with the data line we created above
			graph.append("path")
				.datum(points)
				.attr("class", "area")
				.attr("d", area);
			graph.append("path").attr("d", line(points));
			graph.append("line").attr("x1", 30).attr("x2", 840).attr("y1", ymedian).attr("y2", ymedian).attr("class", "median");
			graph.append("line").attr("x1", 30).attr("x2", 840).attr("y1", ymean).attr("y2", ymean).attr("class", "mean");
			
			//graph.append("line").attr("x1", 30).attr("x2", 625).attr("y1", yupper_deviation).attr("y2", yupper_deviation).attr("class", "deviation");
			//graph.append("line").attr("x1", 30).attr("x2", 625).attr("y1", ylower_deviation).attr("y2", ylower_deviation).attr("class", "deviation");
			// Add the x-axis.
			graph.append("g")
			    .attr("class", "x axis")
			    .attr("transform", "translate(0," + 330 + ")")
			    .call(xAxis);
			
			//// Add the y-axis.
			graph.append("g")
			    .attr("class", "y axis")
			    .attr("transform", "translate(" + 30 + ",0)")
			    .call(yAxis);
		},
		showGroupObservationChart: function(id){
			dopplerStorage.groupObservations = [];
			$("#seriesLegend").empty();
			
			$.getJSON("http://"+location.hostname+":5000/group/"+id+"/focus?deleted=0", function(res){
				_.forEach(res.foci, function(focus){
					var limit = $("#group_observations").val() * parseInt(60/focus.interval);
					$.getJSON("http://"+location.hostname+":5000/focus/"+focus.id+"/observation?limit="+limit, function(res){
						$("#seriesLegend").append("<span class='label series"+dopplerStorage.groupObservations.length+"Legend' data-toggle='collapse' data-target='#timeSeriesChart path.path"+dopplerStorage.groupObservations.length+"'>"+focus.name+"</span>");
						dopplerStorage.groupObservations.push({focus:focus, observations:res.observations});
						dopplerStorage.buildMultiLineSeries(dopplerStorage.groupObservations, "#timeSeriesChart");
					});
				});
			});
		},
		buildMultiLineSeries: function(sets, target){
			$(target).empty();
			var graph = d3.select(target).append("svg:svg").attr("width", "100%").attr("height", "100%");
			// create a simple data array that we'll plot with a line (this array represents only the Y values, X will just be the index location)
			var paths=[];
			for(var i in sets){
				var observations = sets[i].observations;
				var chunk_size = parseInt(60/sets[i].focus.interval);
				console.log("chunking " +chunk_size +" unit blocks");
				var sum = 0;
				var points = [];
				for(var i=0; i<observations.length; i++){
					if (((i+1)%chunk_size) == 0) {
						var average = sum/chunk_size;
						points.push({duration:average, occured:new Date(Math.floor(observations[i].observation_begin * 1000))});
						sum = 0;
					}
					sum+=observations[i].observation_end - observations[i].observation_begin;
				}
				if (((i+1)%chunk_size) > 0) {
					var average = sum/((i+1)%chunk_size);
					points.push({duration:average, occured:new Date(Math.floor(observations[observations.length-1].observation_begin * 1000))});
				}
				paths.push(points);
			}
			var superSet = d3.merge(paths);
			
			// X scale will fit values from 0-10 within pixels 0-100
			//var x = d3.scale.linear().domain([0,(limit/5)-1]).range([30, 625]);
			// Scale X as time
			var x = d3.time.scale().domain(d3.extent(superSet, function(d) { return d.occured; })).range([30, 870]);
			// Y scale will fit values from 0-10 within pixels 0-100
			var y = d3.scale.linear().domain(d3.extent(superSet, function(d) { return d.duration; })).range([330, 0]);
	
			// create a line object that represents the SVN line we're creating
			var line = d3.svg.line()
				// assign the X function to plot our line as we wish
				.x(function(d,i) { 
					// verbose logging to show what's actually being done
					//console.log('Plotting X value for data point: ' + d + ' using index: ' + i + ' to be at: ' + x(i) + ' using our xScale.');
					// return the X coordinate where we want to plot this datapoint
					return x(points[i].occured); 
				})
				.y(function(d,i) { 
					// verbose logging to show what's actually being done
					// return the Y coordinate where we want to plot this datapoint
					return y(points[i].duration); 
				});
			
			//.tickFormat(function(n){new Date(Math.floor(observations[n].observation_end * 1000)).toISOString()})
			xAxis = d3.svg.axis().scale(x).ticks(5).tickFormat(d3.time.format("%I:%M %p")).tickSize(-360).orient("bottom");;
			yAxis = d3.svg.axis().scale(y).ticks(4).tickSize(-840).orient("left");
			console.log("plotted "+points.length+" points");
			// display the line by appending an svg:path element with the data line we created above
			for(var i in paths){
				var points = paths[i];
				graph.append("path").attr("d", line(points)).attr("class", "path"+i);
			}
			// Add the x-axis.
			graph.append("g")
			    .attr("class", "x axis")
			    .attr("transform", "translate(0," + 330 + ")")
			    .call(xAxis);

			//// Add the y-axis.
			graph.append("g")
			    .attr("class", "y axis")
			    .attr("transform", "translate(" + 30 + ",0)")
			    .call(yAxis);
		},
		buildFocusParameters: function(){
			var params = {
				class: "SC",
				type: $("#focus_type").val(),
				groups: _.map($("#groups_selected li"), function(input){ return $(input).data("id") }),
			};
			_.forEach($("#focus_parameters :input"), function(elem){
				var $inp = $(elem);
				var name = $inp.prop("name");
				params[$(elem).prop("name")] = $(elem).val();
			});
			return params;
		},
		getFocusTypes: function(){
			$.getJSON("http://"+location.hostname+":5000/focus_type", function(res){
				dopplerStorage.focus_types = res;
				_.forEach(_.sortBy(_.keys(dopplerStorage.focus_types), function(n){return n.toUpperCase()}), function(key){
					$("#focus_type").append($("<option>").text(key));
					$("#focus-type-filter").append($("<option>").text(key));
				});
				$("#focus_type").on("change", function(){
					$("#focus_parameters").empty();
					$("#focus_parameters").append(dopplerStorage.focus_param_template({parameters:dopplerStorage.focus_types[$("#focus_type").val()]}));
				});
				$("#focus_type").trigger("change");
				dopplerStorage.bootstrapSelect();
			});
		},
		getGroups: function () {
			$.getJSON("http://"+location.hostname+":5000/group?deleted=0", function(res){
				$("#group_list").empty();
				$("#group_list").append(dopplerStorage.group_template(res));
				$("#focus_groups").empty();
				$("#groups_selected").empty();
				$("#focus_groups").append(dopplerStorage.select_group_template(res));
				//$("#focus_groups").buttonset({items:"input[type=checkbox]"});
			});
		},
		update_observers: function (){
			$.getJSON("http://"+location.hostname+":5000/observer", function(res){
				var obs = {};
				var ofset=1;
				_.forEach(res.observers, function(observer){
					obs[observer.id] = 1;
					if ($("#"+observer.id).length) {
						$("#"+observer.id).replaceWith(dopplerStorage.observer_template({observer:observer, offset:ofset}));
						$("#"+observer.id).effect("highlight");
					}else{
						$("#observer_list").append(dopplerStorage.observer_template({observer:observer, offset:ofset}));
					}
					var g = createGauge("guage"+ofset, "Load", 0, 60);
					g.redraw(observer.load);
					ofset++;
				});
				$(".observer_record").each(function(){
					if (! obs[$(this).prop("id")]) {
						$(this).remove();
					}
				});
			});
		},
		addFocusGroup: function(){
			$.ajax({
				url:"http://"+location.hostname+":5000/focus/"+$("#add_focus_group_target").val()+"/"+$("#add_group_select").val(),
				method: "POST",
				data:{},
				success:function(){
					dopplerStorage.updateFoci();
					$("#addGroupModal").modal("hide");
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
		updateFociPanelSize: function(){
			var $ct = $("#main-content-tabs .tab-pane.active");
			console.log("update panel size");
			$ct.css("max-height", 10);
			var dh = $(document).height();
			$ct.css("max-height", dh - $ct.offset().top - 28);
		},
		updateFoci: function(next){
			$("#focus_loading").show();
			$("#focus_table").hide();
			var params=[];
			if (!$("#includeDeletedFoci").is(":checked")) {
				params.push("deleted=0");
			}
			params.push("&limit="+$("#foci-per-page").val());
			if (next) {
				dopplerStorage.focus_pages.push(next);
				params.push("start_after="+next);
			}
			if ($("#focus-type-filter").val() != "All") {
				params.push("type="+$("#focus-type-filter").val());
			}
			dopplerStorage.updateFociPanelSize();
			$.getJSON("http://"+location.hostname+":5000/focus?"+params.join("&"), function(res){
				$("#foci_list").empty();
				var htmstr = dopplerStorage.foci_template(res);
				$("#foci_list").append(htmstr);
				$("#foci_list button").button();
				if (res.foci.length == parseInt($("#foci-per-page").val()) || next) {
					$(".pagination").show();
					if (res.foci.length == parseInt($("#foci-per-page").val())){
						$(".pagination .next_page").closest("li").removeClass('disabled');
						$(".pagination .next_page").data("start-from", res.foci[res.foci.length-1].id);
					}else{
						$(".pagination .next_page").closest("li").addClass('disabled');
					}
					if (next) {
						$(".pagination .prev_page").closest("li").removeClass('disabled');
						$(".pagination .prev_page").data("start-from", dopplerStorage.previous_page);
					}else{
						$(".pagination .prev_page").closest("li").addClass('disabled');
					}
				}else{
					$(".pagination").hide();
				}
				dopplerStorage.previous_page = next;
				$("#focus_loading").hide();
				$("#focus_table").show();
			});
		},
		bindDualListBox: function(){
			$('body').on('click', '.list-group .list-group-item', function () {
			    $(this).toggleClass('active');
			});
			$('.list-arrows button').click(function () {
			    var $button = $(this), actives = '';
			    if ($button.hasClass('move-left')) {
				actives = $('.list-right ul li.active');
				actives.clone().removeClass("active").appendTo('.list-left ul');
				actives.remove();
			    } else if ($button.hasClass('move-right')) {
				actives = $('.list-left ul li.active');
				actives.clone().removeClass("active").appendTo('.list-right ul');
				actives.remove();
			    }
			});
			$('.dual-list .selector').click(function () {
			    var $checkBox = $(this);
			    if (!$checkBox.hasClass('selected')) {
				$checkBox.addClass('selected').closest('.well').find('ul li:not(.active)').addClass('active');
				$checkBox.children('i').removeClass('glyphicon-unchecked').addClass('glyphicon-check');
			    } else {
				$checkBox.removeClass('selected').closest('.well').find('ul li.active').removeClass('active');
				$checkBox.children('i').removeClass('glyphicon-check').addClass('glyphicon-unchecked');
			    }
			});
			$('[name="SearchDualList"]').keyup(function (e) {
			    var code = e.keyCode || e.which;
			    if (code == '9') return;
			    if (code == '27') $(this).val(null);
			    var $rows = $(this).closest('.dual-list').find('.list-group li');
			    var val = $.trim($(this).val()).replace(/ +/g, ' ').toLowerCase();
			    $rows.show().filter(function () {
				var text = $(this).text().replace(/\s+/g, ' ').toLowerCase();
				return !~text.indexOf(val);
			    }).hide();
			});
			
		},
		bootstrapSelect:function(){
			$('.selectpicker').selectpicker();
		}
	});
	dopplerStorage.initPage();
});

function createGauge(name, label, min, max)
{
	var config = 
	{
		size: 120,
		label: label,
		min: undefined != min ? min : 0,
		max: undefined != max ? max : 100,
		minorTicks: 5
	}
	
	var range = config.max - config.min;
	config.yellowZones = [{ from: config.min + range*0.75, to: config.min + range*0.9 }];
	config.redZones = [{ from: config.min + range*0.9, to: config.max }];
	var guage = new Gauge(name + "GaugeContainer", config);
	guage.render();
	return guage;
}

$(document).ready(function() {
  // add a hash to the URL when the user clicks on a tab
  $('a[data-toggle="tab"]').on('click', function(e) {
    history.pushState(null, null, $(this).attr('href'));
  });
  // navigate to a tab when the history changes
  window.addEventListener("popstate", function(e) {
	setState();
  });
});
function setState(){
    if (location.hash) {
	var activeTab = $('[href=' + location.hash + ']');
	console.log(activeTab);
	if (activeTab.length) {
	  activeTab.tab('show');
	} else {
	  $('.nav-tabs a:first').tab('show');
	}
    }
}