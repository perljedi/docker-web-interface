#!perl
use Plack::Builder;
use Router::Resource;
use Plack::Runner;
use HTTP::Tiny::UNIX;
use Plack::Response;

my $router = router {
    resource '/dockerapi/containers' => sub {
	GET {
	    my($env) = @_;
	    my $response = HTTP::Tiny::UNIX->new->get('http:/var/run/docker.sock//containers/json');
	    my $res = Plack::Response->new(200);
	    $res->content_type('application/json');
	    $res->body($respons->{content});
	    return $res->finalize;
	};
	POST {};
    };
} auto_options => 1;

# Build the Plack app to use it.
my $runner = Plack::Runner->new;
$runner->parse_options(@ARGV);
$runner->run(builder {
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
            path => qr{^(?:/(images|js|css)/|/?index.htm)}, root => './htdocs/';
        sub {  $router->dispatch(shift) };
    });
    
