
FROM perl:5.20
MAINTAINER Dave Mueller <dave@perljedi.com>

RUN cpanm --quiet --notest --skip-satisfied Dist::Zilla
RUN dzil install

EXPOSE 9999

ENTRYPOINT ["twiggy --port 9999 -D"]
