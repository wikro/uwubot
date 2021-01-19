FROM node:current

RUN mkdir -p /uww/node_modules
WORKDIR /uwu

COPY index.js .
COPY package.json .

ENV SECRET=""

RUN npm install

USER nobody

CMD [ "node", "index.js" ]
