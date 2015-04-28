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
				    {"targets":["unixDate"], render:function(data, type, row, meta){return new Date(data * 1000).toISOString()}},
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
				    {data:{"_":"Created"}, "title":"Created"}
			    ],
			    "dom":"<'row'<'col-sm-1'l><'col-sm-2'<'#filterOption'>><'col-sm-9'f>><'row'<'col-sm-12'tr>><'row'<'col-sm-6'i><'col-sm-6'p>>",
			    "order":[],
			    "scrollY": (dh - $ct.offset().top - 180)+"px",
			    "scrollCollapse": true,
			    //data:res
		    });
		    $("#filterOption").html('<div class="form-horizontal funkyradio"><div class="funkyradio-default"><input type="checkbox" name="checkbox" id="showAllContainers" checked/><label for="showAllContainers">Show All</label></div></div>')
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
		    var table = $("#image_table").dataTable({
			    "ajax":{url:"/dockerapi/images", "dataSrc": ""},
			    "columnDefs":[
				    {"targets":["unixDate"], render:function(data, type, row, meta){return new Date(data * 1000).toISOString()}},
				    {"targets":0, "orderable":false}
			    ],
			    "columns":[
				    {data:null,defaultContent:"",width:"10px", "title":""},
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
					$("#logs_output").prepend("<li>"+line+"</li>");
				});
				var max_lines = $("#log_lines").val()
				while($("#logs_output li").size() > max_lines){
					$("#logs_output li:last").remove();
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
				}
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
	$("#container_top").on("show.bs.modal", docker.containerTopProcesses);
	$(document).on("click", ".reloadContainers", docker.reloadContainers);
	$("#showAllContainers").on("change", docker.toggleAllContainers);
	$("#showContainers").on("show.bs.tab", function(){docker.reloadContainers();});
	$("#showImages").on("show.bs.tab", function(){docker.showImageTab();});
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