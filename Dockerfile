FROM node:0.12-onbuild
RUN npm install -g gulp knex && npm install pg
RUN gulp
EXPOSE 3000
