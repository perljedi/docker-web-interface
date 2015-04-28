package Docker::Web::Interface;
use Moose;
use Plack::Builder;
use Router::Resource;
use Plack::Runner;
use HTTP::Tiny::UNIX;
use Plack::Response;
use Plack::Request;
use Data::Dumper;
use AnyEvent::Socket;
use AnyEvent::Handle;
use AnyEvent::WebSocket::Server;
use JSON;

has 'http_object' => (
    is      => 'ro',
    isa     => 'HTTP::Tiny::UNIX',
    lazy    => 1,
    builder => '_build_http_object'
);

has web_socket => (
    is       => 'rw',
    isa      => 'Any',
    required => 0,
);

has debug_connections => (
    is       => 'rw',
    isa      => 'ArrayRef',
    required => 1,
    default  => sub { [] }
);

has socket_subscriptions => (
    is       => 'rw',
    isa      => 'HashRef',
    required => 0,
    lazy     => 1,
    default  => sub { return {}; },
);

has open_streams => (
    is => 'rw',
    isa => 'HashRef',
    required => 0,
    default => sub {return {}; },
);

has 'json' => (
    is       => 'ro',
    isa      => 'JSON',
    required => 1,
    lazy     => 1,
    builder  => '_build_json',
);

sub _build_json {
    return JSON->new->allow_blessed(1)->convert_blessed(1);
}


sub app {
    my $self = shift;

    my $router = $self->_build_router;
    
    $self->_start_websocket;

    
    builder {
	enable 'ContentLength';
	enable sub {
	    my ($app) = shift;
	    sub{
		my($env) = @_;
		my $res = $app->($env);
		push(@{$res->[1]}, 'Access-Control-Allow-Origin',  '*');
		push(@{$res->[1]}, 'Access-Control-Allow-Methods',  'GET, HEAD, OPTIONS, POST, PUT, DELETE');
		return $res;
	    };
	};
        enable "Plack::Middleware::Static",
            path => qr{^(?:/(images|js|css|fonts)/|/?index.htm)}, root => './htdocs/';
        sub {  $router->dispatch(shift) };
    }    
}

sub _build_router {
    my $self = shift;
    my $router = router {
	resource '/dockerapi/containers' => sub {
	    GET { $self->list_containers(@_); };
	};
	resource '/dockerapi/container/{container_id}/start' => sub {
	    POST { $self->start_container(@_); };
	};
	resource '/dockerapi/container/{container_id}/logs' => sub {
	    GET { $self->get_container_logs(@_); };
	};
	resource '/dockerapi/container/{container_id}/follow' => sub {
	    GET { $self->follow_container_logs(@_); };
	};
	resource '/dockerapi/container/{container_id}' => sub {
	    DELETE { $self->delete_container(@_); };
	    GET { $self->inspect_container(@_); };
	};
	resource '/dockerapi/container/{container_id}/top' => sub {
	    GET { $self->get_container_top_processes(@_); };
	};
	resource '/dockerapi/container/{container_id}/pause' => sub {
	    POST { $self->pause_container(@_); };
	};
	resource '/dockerapi/container/{container_id}/unpause' => sub {
	    POST { $self->resume_container(@_); };
	};
	resource '/dockerapi/container/{container_id}/stop' => sub {
	    POST { $self->stop_container(@_); };
	};
	resource '/dockerapi/container/{container_id}/restart' => sub {
	    POST { $self->restart_container(@_); };
	};
	resource '/dockerapi/containers/all' => sub {
	    GET { $self->get_all_containers(@_); };
	};
	resource '/dockerapi/info' => sub {
	    GET { $self->get_system_info(@_); };
	};
	resource '/dockerapi/images' => sub {
	    GET { $self->get_images(@_) };
	};
    } auto_options => 1;
    return $router;
}

sub start_websocket {
    my $self = shift;
    my $server = AnyEvent::WebSocket::Server->new;
    $self->web_socket(tcp_server('0.0.0.0', 9123, sub {
	my ($fh) = @_;
	$server->establish($fh)->cb(sub {
	    my $connection = eval { shift->recv };
	    if ($@) {
		    warn "Invalid connection request: $@\n";
		    close($fh);
		    return;
	    }
	    
	    push(@{$self->debug_connections}, $connection);
	    $connection->on(each_message=>sub {
		my($con, $msg) = @_;
		my $container_id = $msg->body;
		if (! exists $self->open_streams->{ $container_id }){
		    $self->open_log_stream($container_id);
		}
		push @{ $self->socket_subscriptions->{$container_id} }, $con;
	    });
	    $connection->on(finish => sub {
		    my $cons = $self->debug_connections;
		    @$cons = grep { $_ != $connection } @$cons;
		    foreach my $container_id (keys %{ $self->socket_subscriptions }){
			$self->socket_subscriptions->{$container_id} = [grep { $_ != $connection } @{ $self->socket_subscriptions->{$container_id} }];
			if (scalar(@ { $self->socket_subscriptions->{$container_id} }) < 1) {
			    delete $self->open_streams->{$container_id};
			}
		    }
		    undef $connection;
	    });
	});
    }));
}

sub list_containers {
    my($self, $env) = @_;
    my $response = $self->http_object->get('http:/var/run/docker.sock//containers/json');
    my $res = Plack::Response->new(200);
    $res->content_type('application/json');
    $res->body($response->{content});
    return $res->finalize;
}

sub start_container {
    my($self, $env, $uri_params) = @_;
    my $response = $self->http_object->post('http:/var/run/docker.sock//containers/'.$uri_params->{container_id}.'/start');
    my $res = Plack::Response->new($response->{status});
    $res->content_type('application/json');
    $res->body($response->{content});
    return $res->finalize;
}

sub get_container_logs {
    my($self, $env, $uri_params) = @_;
    my $req = Plack::Request->new($env);
    my $tail = $req->param('tail');
    my $response = $self->http_object->get('http:/var/run/docker.sock//containers/'.$uri_params->{container_id}.'/logs?stderr=1&tail='.$tail);
    my $res = Plack::Response->new($response->{status});
    $res->content_type('text/plain');
    print STDERR Dumper($response)."\n";
    $res->body($response->{content});
    return $res->finalize;
}

sub open_log_stream {
    my $self = shift;
    my($container_id) = @_;
    tcp_connect "unix/", "/var/run/docker.sock",
	sub {
	    my ($fh) = @_
	    or die "unable to connect: $!";
	    
	    $self->open_streams->{$container_id} = new AnyEvent::Handle(
		fh     => $fh,
		on_error => sub {
		    AE::log error => $_[2];
		    $_[0]->destroy;
		},
		on_eof => sub {
		    delete $self->open_streams->{$container_id};
		    delete $self->socket_subscriptions->{$container_id};
		    AE::log info => "Done.";
		},
		on_read => sub {
		    my $data = $_[0]->rbuf;
		    $data =~ s/[^[:graph:] ]//g;
		    $_[0]->rbuf = "";
		    $_->send($self->json->encode({contianer=>$container_id, data=>$data."\n"})) for @{$self->socket_subscriptions->{$container_id}};
		},
	    );
	    
	    $self->open_streams->{$container_id}->push_write ("GET /containers/".$container_id."/logs?stderr=1&follow=1&tail=10 HTTP/1.0\015\012\015\012");
	};
    return 1;
}

sub follow_container_logs {
    my($self, $env, $uri_params) = @_;
    tcp_connect "unix/", "/var/run/docker.sock",
       sub {
	  my ($fh) = @_
	     or die "unable to connect: $!";
     
	  $self->handle(new AnyEvent::Handle
	     fh     => $fh,
	     on_error => sub {
		AE::log error => $_[2];
		$_[0]->destroy;
	     },
	     on_eof => sub {
		
		$self->handle(undef); # destroy handle
		$self->web_socket(undef);
		$self->debug_connections([]);
		AE::log info => "Done.";
	     },
	     on_read => sub {
		my $data = $_[0]->rbuf;
		$data =~ s/[^[:graph:] ]//g;
		$_[0]->rbuf = "";
		$_->send($data."\n") for @{$self->debug_connections};
	     });
     
	  $self->handle->push_write ("GET /containers/".$uri_params->{container_id}."/logs?stderr=1&follow=1&tail=10 HTTP/1.0\015\012\015\012");
       };
    
    my $res = Plack::Response->new(200);
    $res->content_type('application/json');
    $res->body('{"port":9123}');
    return $res->finalize;
}

sub delete_container {
    my($self, $env, $uri_params) = @_;
    my $response = $self->http_object->delete('http:/var/run/docker.sock//containers/'.$uri_params->{container_id});
    my $res = Plack::Response->new($response->{status});
    $res->content_type('application/json');
    $res->body($response->{content});
    return $res->finalize;
}

sub inspect_container {
    my($self, $env, $uri_params) = @_;
    my $response = $self->http_object->get('http:/var/run/docker.sock//containers/'.$uri_params->{container_id}.'/json');
    my $res = Plack::Response->new($response->{status});
    $res->content_type('application/json');
    $res->body($response->{content});
    return $res->finalize;
}

sub get_container_top_processes {
    my($self, $env, $uri_params) = @_;
    my $response = $self->http_object->get('http:/var/run/docker.sock//containers/'.$uri_params->{container_id}.'/top');
    my $res = Plack::Response->new($response->{status});
    $res->content_type('application/json');
    $res->body($response->{content});
    return $res->finalize;
}

sub pause_container {
    my($self, $env, $uri_params) = @_;
    my $response = $self->http_object->post('http:/var/run/docker.sock//containers/'.$uri_params->{container_id}.'/pause');
    my $res = Plack::Response->new($response->{status});
    $res->content_type('application/json');
    $res->body($response->{content});
    return $res->finalize;
}

sub resume_container {
    my($self, $env, $uri_params) = @_;
    my $response = $self->http_object->post('http:/var/run/docker.sock//containers/'.$uri_params->{container_id}.'/unpause');
    my $res = Plack::Response->new($response->{status});
    $res->content_type('application/json');
    $res->body($response->{content});
    return $res->finalize;
}

sub stop_container {
    my($self, $env, $uri_params) = @_;
    my $response = $self->http_object->post('http:/var/run/docker.sock//containers/'.$uri_params->{container_id}.'/stop');
    my $res = Plack::Response->new($response->{status});
    $res->content_type('application/json');
    $res->body($response->{content});
    return $res->finalize;
}

sub restart_container {
    my($self, $env, $uri_params) = @_;
    my $response = $self->http_object->post('http:/var/run/docker.sock//containers/'.$uri_params->{container_id}.'/restart');
    my $res = Plack::Response->new($response->{status});
    $res->content_type('application/json');
    $res->body($response->{content});
    return $res->finalize;
}

sub get_all_containers {
    my($self, $env) = @_;
    my $response = $self->http_object->get('http:/var/run/docker.sock//containers/json?all=1');
    my $res = Plack::Response->new(200);
    $res->content_type('application/json');
    $res->body($response->{content});
    return $res->finalize;
}

sub get_system_info {
    my($self, $env) = @_;
    my $response = $self->http_object->get('http:/var/run/docker.sock//info');
    my $res = Plack::Response->new(200);
    $res->content_type('application/json');
    $res->body($response->{content});
    return $res->finalize;
}

sub get_images {
    my($self, $env) = @_;
    my $response = $self->http_object->get('http:/var/run/docker.sock//images/json');
    my $res = Plack::Response->new(200);
    $res->content_type('application/json');
    $res->body($response->{content});
    return $res->finalize;
}

sub _build_http_object {
    return HTTP::Tiny::UNIX->new;
}
return 42;
