
FROM perl:5.20
MAINTAINER Dave Mueller <dave@perljedi.com>

ADD . /opt/docker-web-interface
RUN cpanm --quiet --notest --skip-satisfied Dist::Zilla
WORKDIR /opt/docker-web-interface
RUN dzil install

EXPOSE 9999

ENTRYPOINT ["twiggy --port 9999 -D"]
