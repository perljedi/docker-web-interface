
FROM perl:5.20
MAINTAINER Dave Mueller <dave@perljedi.com>

RUN cpanm Dist::Zilla
RUN dzil install

EXPOSE 9999

ENTRYPOINT ["twiggy --port 9999 -D"]
