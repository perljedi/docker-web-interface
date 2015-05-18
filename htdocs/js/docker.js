$(document).ready(function(){
	var docker = $.docker || {};
	$.docker = docker;
	$.extend(docker, {
		getContainers: function(){
		    var $ct = $("#main-content-tabs .tab-pane.active");
		    $ct.css("max-height", 10);
		    var dh = $(document).height();
		    $ct.css("max-height", dh - $ct.offset().top - 55);
		    var buttonTemplate = _.template($("#container_buttons").html());
		    var table = $("#container_table").dataTable({
			    "initComplete": function () {
				    docker.containerTable = this.api();
			    },
			    "ajax":{url:"/dockerapi/containers/all", "dataSrc": ""},
			    "columnDefs":[
				    {"targets":6, render:function(data, type, row, meta){return new Date(data * 1000).toISOString()}},
				    {"targets":0, "orderable":false}
			    ],
			    "columns":[
				    {data:"Id",render:function(data, type, row, meta){return buttonTemplate({container:row})}, width:"175px", "title":""},
				    {data:{"_":"Names.0"}, "title":"Name"},
				    {data:{"_":"Image"}, "title":"Image"},
				    {data:{"_":"Command"}, "title":"Command"},
				    {data:"Ports", render: function(data, type, row, meta){
					    return _.map(data, function(portSpec){
						    var disp= portSpec.PrivatePort;
						    if (portSpec.IP) {
							    disp += "/"+portSpec.IP+":"+portSpec.PublicPort
						    }
						    return disp;
					    }).join("<br />")
				    }, "title":"Ports"},
				    {data:{"_":"Status"}, "title":"Status"},
				    {data:{"_":"Created"}, "title":"Created"},
			    ],
			    "pageLength": 25,
			    "dom":"<'row'<'col-sm-1'l><'col-sm-2'<'#filterOption'>><'col-sm-9'f>><'row'<'col-sm-12'tr>><'row'<'col-sm-3'i><'col-sm-4'<'#refreshButton'><'#createButton'>><'col-sm-5'p>>",
			    "order":[],
			    "scrollY": (dh - $ct.offset().top - 180)+"px",
			    "scrollCollapse": true,
			    //data:res
		    });
		    $("#filterOption").html('<div class="form-horizontal funkyradio"><div class="funkyradio-default"><input type="checkbox" name="checkbox" id="showAllContainers" checked/><label for="showAllContainers">Show All</label></div></div>')
		    $("#refreshButton").html('<button class="btn btn-default btn-lg reloadContainers pull-left"><span class="glyphicon glyphicon-refresh" aria-hidden="true"></span> Refresh</button>')
		    $("#createButton").html('<button class="btn btn-default btn-lg createContainer pull-right" data-toggle="modal" data-target="#container_create"><span class="glyphicon glyphicon-plus" aria-hidden="true"></span>New</button>')
		    docker.containerDatatable = table.api();
		    //docker.containerTable = new $.fn.dataTable.Api( "#container_table" );
		},
		getContainerLogs: function(event){
			var id = $(event.relatedTarget).data('container');
			$.ajax({
				url:"/dockerapi/container/"+id+"/logs?stderr=1&tail=20",
				success: function(res, status, jqxhr){
					console.log("here")
					$("#logs_output").html(res);
				}
			});
		},
		reloadContainers: function(){
		    docker.containerDatatable.ajax.reload(null, false);
		},
		showImageTab: function(){
		    if (docker.imageDatatable) {
			    docker.imageDatatable.ajax.reload(null, false);
		    }else{
			    docker.getImages();
		    }
		},
		getImages: function(){
		    var $ct = $("#main-content-tabs .tab-pane.active");
		    $ct.css("max-height", 10);
		    var dh = $(document).height();
		    $ct.css("max-height", dh - $ct.offset().top - 28);
		    var buttonTemplate = _.template($("#image_buttons").html());
		    var table = $("#image_table").dataTable({
			    "ajax":{url:"/dockerapi/images", "dataSrc": ""},
			    "columnDefs":[
				    {"targets":2, render:function(data, type, row, meta){return new Date(data * 1000).toISOString()}},
				    {"targets":1, render:function(data, type, row, meta){return data.replace(/<none>/g, "none")}},
				    {"targets":0, "orderable":false}
			    ],
			    "columns":[
				    {data:null,render:function(data, type, row, meta){return buttonTemplate({image:row})}, width:"25px", "title":""},
				    {data:{"_":"RepoTags.0"}, "title":"Name"},
				    {data:{"_":"Created"}, "title":"Created"}
			    ],
			    "scrollY":        (dh - $ct.offset().top - 125)+"px",
			    "scrollCollapse": true,
			    "order":[]
		    });
		    docker.imageDatatable = table.api();
		},
		toggleAllContainers: function(){
		    if ($(this).is(":checked")) {
			    docker.containerDatatable.ajax.url("/dockerapi/containers/all");
		    }
		    else {
			    docker.containerDatatable.ajax.url("/dockerapi/containers");
		    }
		    docker.containerDatatable.ajax.reload();
		},
		startContainer: function(){
		    var row = $(this).closest("tr"); 
		    var id = $(this).data("container");
		    console.log(id);
		    $.ajax({
			    type: "POST",
			    url:"/dockerapi/container/"+id+"/start",
			    data: {},
			    success: function(res){
				    docker.reloadContainers();
			    },
			    complete: function(xhr, status){
				    console.log(status);
			    },
			    error: function(xhr, status, message){
				swal({
				    title: "Ohh's No!",
				    text: xhr.responseText,
				    type: "error",
				  });
			    }
		    });
		},
		pauseContainer: function(){
		    var button= $(this);
		    var row = $(this).closest("tr"); 
		    var id = $(this).data("container");
		    console.log(id);
		    $.ajax({
			    type: "POST",
			    url:"/dockerapi/container/"+id+"/pause",
			    data: {},
			    success: function(res){
				    docker.reloadContainers();
			    },
			    complete: function(xhr, status){
				    console.log(status);
			    },
			    error: function(xhr, status, message){
				swal({
				    title: "Ohh's No!",
				    text: xhr.responseText,
				    type: "error",
				  });
			    }
		    });
		},
		unpauseContainer: function(){
		    var button= $(this);
		    var row = $(this).closest("tr"); 
		    var id = $(this).data("container");
		    console.log(id);
		    $.ajax({
			    type: "POST",
			    url:"/dockerapi/container/"+id+"/unpause",
			    data: {},
			    success: function(res){
				    docker.reloadContainers();
			    },
			    complete: function(xhr, status){
				    console.log(status);
			    },
			    error: function(xhr, status, message){
				swal({
				    title: "Ohh's No!",
				    text: xhr.responseText,
				    type: "error",
				  });
			    }
		    });
		},
		stopContainer: function(){
		    var row = $(this).closest("tr"); 
		    var id = $(this).data("container");
		    console.log(id);
		    $.ajax({
			    type: "POST",
			    url:"/dockerapi/container/"+id+"/stop",
			    data: {},
			    success: function(res){
				    docker.reloadContainers();
			    },
			    complete: function(xhr, status){
				    console.log(status);
			    },
			    error: function(xhr, status, message){
				swal({
				    title: "Ohh's No!",
				    text: xhr.responseText,
				    type: "error",
				  });
			    }
		    });
		},
		restartContainer: function(){
		    var row = $(this).closest("tr"); 
		    var id = $(this).data("container");
		    console.log(id);
		    $.ajax({
			    type: "POST",
			    url:"/dockerapi/container/"+id+"/restart",
			    data: {},
			    success: function(res){
				    docker.reloadContainers();
			    },
			    complete: function(xhr, status){
				    console.log(status);
			    },
			    error: function(xhr, status, message){
				swal({
				    title: "Ohh's No!",
				    text: xhr.responseText,
				    type: "error",
				  });
			    }
		    });
		},
		confirmDeleteContainer: function(){
		    var id = $(this).data("container");
		    swal({
			title: "Are you sure?",
			text: "Delete this container?",
			type: "info",
			showCancelButton: true,
			confirmButtonClass: 'btn-primary reallyDeleteContainer',
			confirmButtonText: 'Delete',
			
		      },
		      function(proceed){if(proceed){ docker.deleteContainer(id) } });		
		},
		deleteContainer: function(id){
		    $.ajax({
			    type: "DELETE",
			    url:"/dockerapi/container/"+id,
			    data: {},
			    success: function(res){
				    docker.reloadContainers();
			    },
			    complete: function(xhr, status){
				    console.log(status);
			    },
			    error: function(xhr, status, message){
				swal({
				    title: "Ohh's No!",
				    text: xhr.responseText,
				    type: "error",
				  });
			    }
		    });
		},
		openLogSocket: function(event){
			var id = $(event.relatedTarget).data('container');
			$("#logs_output").empty();
			docker.openWebSocket = new ReconnectingWebSocket('ws://' + location.hostname + ':9123/');
			docker.openWebSocket.onopen = function(){
				docker.openWebSocket.send(id);
			};
			docker.openWebSocket.onmessage = function (event) {
				var data = JSON.parse(event.data);
				_.forEach(_.trim(data.data).split(/\n/), function(line){
					$("#logs_output").append("<li>"+line+"</li>");
				});
				var max_lines = $("#log_lines").val()
				while($("#logs_output li").size() > max_lines){
					$("#logs_output li:first").remove();
				}
			}
		},
		manualOpenSocket: function(id){
			docker.openWebSocket = new ReconnectingWebSocket('ws://' + location.hostname + ':9123/');
			docker.openWebSocket.onopen = function(){
				docker.openWebSocket.send(id);
			};
			docker.openWebSocket.onmessage = function (event) {
				var data = JSON.parse(event.data);
				console.log(data);
			}
		},
		inspectContainer: function(event){
			var id = $(event.relatedTarget).data('container');
			$.ajax({
				type: "GET",
				url:"/dockerapi/container/"+id,
				data: {},
				success: function(res){
					console.log(res);
					var template = _.template($("#inspectContainerTempalte").html());
					$("#inspect_ouput").html(template(res));
				},
				complete: function(xhr, status){
					console.log(status);
				},
				error: function(xhr, status, message){
				    swal({
					title: "Ohh's No!",
					text: xhr.responseText,
					type: "error",
				      });
				}
			});
		},
		containerTopProcesses: function(event){
			var id = $(event.relatedTarget).data('container');
			$.ajax({
				type: "GET",
				url:"/dockerapi/container/"+id+"/top",
				data: {},
				success: function(res){
					console.log(res);
					var template = _.template($("#containerProcessesTemplate").html());
					$("#proccess_list").html(template(res));
				},
				complete: function(xhr, status){
					console.log(status);
				},
				error: function(xhr, status, message){
				    swal({
					title: "Ohh's No!",
					text: xhr.responseText,
					type: "error",
				  });
				}
			});
		},
		showContainerRename: function(event){
			var id = $(event.relatedTarget).data('container');
			$("#rename_container_id").val(id);
			$("#newName").val(docker.containerDatatable.row($(event.relatedTarget).closest("tr[role=row]")).data().Names[0]);
		},
		inspectImage: function(event){
			var id = $(event.relatedTarget).data('image');
			$.ajax({
				type: "GET",
				url:"/dockerapi/image/"+id,
				data: {},
				success: function(res){
					console.log(res);
					var template = _.template($("#inspectImageTempalte").html());
					$("#inspect_image_ouput").html(template(res));
				},
				complete: function(xhr, status){
					console.log(status);
				},
				error: function(xhr, status, message){
				    swal({
					title: "Ohh's No!",
					text: xhr.responseText,
					type: "error",
				  });
				}
			});
		},
		renameContainer: function(){
			var id = $("#rename_container_id").val();
			var name = $("#newName").val();
			$.ajax({
				type: "PUT",
				url:"/dockerapi/container/"+id,
				data: {name:name},
				success: function(res){
					docker.reloadContainers();
				},
				complete: function(xhr, status){
					console.log(status);
				},
				error: function(xhr, status, message){
				    swal({
					title: "Ohh's No!",
					text: xhr.responseText,
					type: "error",
				  });
				}
			});
		},
		showImageBrowser: function(){
		    var table = $("#image_btab").dataTable({
			    "ajax":{url:"/dockerapi/images", "dataSrc": ""},
			    "columnDefs":[
				    {"targets":1, render:function(data, type, row, meta){return data.replace(/<none>/g, "none")}},
				    {"targets":0, "orderable":false}
			    ],
			    "columns":[
				    {data:null,render:function(data, type, row, meta){return "<button data-dismiss='modal' class='btn btn-default image-browse-select' data-value='"+row.RepoTags[0]+"'>select</button>"}, width:"25px", "title":""},
				    {data:{"_":"RepoTags.0"}, "title":"Name"},
			    ],
			    scrollY: "200px",
			    "scrollCollapse": true,
			    "order":[]
		    });
		}
	});
	docker.getContainers();
	
	$(document).on("click", ".startContainer", docker.startContainer);
	$(document).on("click", ".stopContainer", docker.stopContainer);
	$(document).on("click", ".restartContainer", docker.restartContainer);
	$(document).on("click", ".pauseContainer:not(.active)", docker.pauseContainer);
	$(document).on("click", ".pauseContainer.active", docker.unpauseContainer);
	$(document).on("click", ".deleteContainer", docker.confirmDeleteContainer);
	$("#container_logs").on("hide.bs.modal", function(){docker.openWebSocket.close()});
	$("#container_logs").on("show.bs.modal", docker.openLogSocket);
	$("#inspect_container").on("show.bs.modal", docker.inspectContainer);
	$("#inspect_image").on("show.bs.modal", docker.inspectImage);
	$("#container_top").on("show.bs.modal", docker.containerTopProcesses);
	$("#container_rename").on("show.bs.modal", docker.showContainerRename);
	$("#image_browse").on("show.bs.modal", docker.showImageBrowser);
	$(document).on("click", ".reloadContainers", docker.reloadContainers);
	$("#showAllContainers").on("change", docker.toggleAllContainers);
	$("#showContainers").on("show.bs.tab", function(){docker.reloadContainers();});
	$("#showImages").on("show.bs.tab", function(){docker.showImageTab();});
	$("#doRenameContainer").on("click", docker.renameContainer);
	$("#add_export_port").on("click", function(){
		var template = _.template($("#export_ports_template").html());
		var count = $("#exported_port_count").val()
		$(this).before(template({n: count}));
		$("#exported_port_count").val(count+1);
	});
	$(document).on("click", ".remove-host-port", function(){
		$(this).closest(".input-group").remove();
	});
	$("#add_env_var").on("click", function(){
		var template = _.template($("#add_env_var_template").html());
		var count = $("#env_var_count").val()
		$(this).before(template({n: count}));
		$("#env_var_count").val(count+1);
	});
	$(document).on("click", ".remove-env-var", function(){
		$(this).closest(".input-group").remove();
	});
	$(document).on("click", ".image-browse-select", function(){
		var nmstr = $(this).data("value");
		var img = nmstr.split(/:/);
		$("#image_name").val(img[0]);
		$("#image_version").val(img[1]);
	});
	$("#add_mount_point").on("click", function(){
		var template = _.template($("#add_mount_template").html());
		var count = $("#mount_count").val()
		$(this).before(template({n: count}));
		$("#mount_count").val(count+1);
	});
	$(document).on("click", ".remove-mount", function(){
		$(this).closest(".input-group").remove();
	});
	$("#container_create").on("show.bs.modal", function(){
		$(".exported-port-group").remove();
		$(".env-var-group").remove();
		$(".mount-point-group").remove();
		$("#env_var_count").val(1);
		$("#exported_port_count").val(1);
		$("#mount_count").val(1);
	});
	
	$("#doStartContainer").on("click", function(){
		var options = {
			name           : $("#container_name").val(),
			command        : $("#command").val(),
			image_name     : $("#image_name").val(),
			image_version  : $("#image_version").val(),
			exported_ports : [],
			environment    : [],
			mounts         : []
		};
		$(".exported-port-group").each(function(group){
			options.exported_ports.push({
				container_port: $(this).find(".export-container-port").val(),
				host_port: $(this).find(".export-host-port").val()
			});
		});
		$(".env-var-group").each(function(group){
			options.environment.push({
				name: $(this).find(".env-var-name").val(),
				value: $(this).find(".env-var-value").val()
			});
		});
		$(".mount-point-group").each(function(group){
			options.mounts.push({
				dir: $(this).find(".host-directory-mount").val(),
				path: $(this).find(".container-mount-target").val()
			});
		});
		console.log(options);
		$.ajax({
			type: "POST",
			url:"/dockerapi/containers",
			data: JSON.stringify(options),
			contentType: 'application/json',
			success: function(res){
				docker.reloadContainers();
			},
			complete: function(xhr, status){
				console.log(status);
			},
			error: function(xhr, status, message){
			    swal({
				title: "Ohh's No!",
				text: xhr.responseText,
				type: "error",
			  });
			}
		});
	});
});


function ReconnectingWebSocket(url, protocols) {
		protocols = protocols || [];
	    
		// These can be altered by calling code.
		this.debug = false;
		this.reconnectInterval = 1000;
		this.timeoutInterval = 20000;
	    
		var self = this;
		var ws;
		var forcedClose = false;
		var timedOut = false;
		
		this.url = url;
		this.protocols = protocols;
		this.readyState = WebSocket.CONNECTING;
		this.URL = url; // Public API
	    
		this.onopen = function(event) {
		};
	    
		this.onclose = function(event) {
		};
	    
		this.onconnecting = function(event) {
		};
	    
		this.onmessage = function(event) {
		};
	    
		this.onerror = function(event) {
		};
	    
		function connect(reconnectAttempt) {
		    ws = new WebSocket(url, protocols);
		    
		    self.onconnecting();
		    if (self.debug || ReconnectingWebSocket.debugAll) {
			console.debug('ReconnectingWebSocket', 'attempt-connect', url);
		    }
		    
		    var localWs = ws;
		    var timeout = setTimeout(function() {
			if (self.debug || ReconnectingWebSocket.debugAll) {
			    console.debug('ReconnectingWebSocket', 'connection-timeout', url);
			}
			timedOut = true;
			localWs.close();
			timedOut = false;
		    }, self.timeoutInterval);
		    
		    ws.onopen = function(event) {
			clearTimeout(timeout);
			if (self.debug || ReconnectingWebSocket.debugAll) {
			    console.debug('ReconnectingWebSocket', 'onopen', url);
			}
			self.readyState = WebSocket.OPEN;
			reconnectAttempt = false;
			self.onopen(event);
		    };
		    
		    ws.onclose = function(event) {
			clearTimeout(timeout);
			ws = null;
			if (forcedClose) {
			    self.readyState = WebSocket.CLOSED;
			    self.onclose(event);
			} else {
			    self.readyState = WebSocket.CONNECTING;
			    self.onconnecting();
			    if (!reconnectAttempt && !timedOut) {
				if (self.debug || ReconnectingWebSocket.debugAll) {
				    console.debug('ReconnectingWebSocket', 'onclose', url);
				}
				self.onclose(event);
			    }
			    setTimeout(function() {
				connect(true);
			    }, self.reconnectInterval);
			}
		    };
		    ws.onmessage = function(event) {
			if (self.debug || ReconnectingWebSocket.debugAll) {
			    console.debug('ReconnectingWebSocket', 'onmessage', url, event.data);
			}
			    self.onmessage(event);
		    };
		    ws.onerror = function(event) {
			if (self.debug || ReconnectingWebSocket.debugAll) {
			    console.debug('ReconnectingWebSocket', 'onerror', url, event);
			}
			self.onerror(event);
		    };
		}
		connect(url);
	    
		this.send = function(data) {
		    if (ws) {
			if (self.debug || ReconnectingWebSocket.debugAll) {
			    console.debug('ReconnectingWebSocket', 'send', url, data);
			}
			return ws.send(data);
		    } else {
			throw 'INVALID_STATE_ERR : Pausing to reconnect websocket';
		    }
		};
	    
		this.close = function() {
		    forcedClose = true;
		    if (ws) {
			ws.close();
		    }
		};
	    
		/**
		 * Additional public API method to refresh the connection if still open (close, re-open).
		 * For example, if the app suspects bad data / missed heart beats, it can try to refresh.
		 */
		this.refresh = function() {
		    if (ws) {
			ws.close();
		    }
		};
	    }
	    
	    /**
	     * Setting this to true is the equivalent of setting all instances of ReconnectingWebSocket.debug to true.
	     */
	    ReconnectingWebSocket.debugAll = false;