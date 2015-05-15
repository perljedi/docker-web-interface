#!perl
use Docker::Web::Interface;
use Getopt::Std;

my(%opts)=();
getopts('e:', \%opts);

my $app;

if ($opts{e}) {
    $app = Docker::Web::Interface->new(base_url=>$opts{e})->app;
}
else {
    $app = Docker::Web::Interface->new()->app;    
}

$app
