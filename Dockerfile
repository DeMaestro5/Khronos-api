# Here we are getting our node as Base image
FROM node:20.10.0

# create user in the docker image
USER node

# Creating a new directory for app files and setting path in the container
RUN mkdir -p /home/node/app && chown -R node:node /home/node/app

# setting working directory in the container
WORKDIR /home/node/app

# grant permission of node project directory to node user
COPY --chown=node:node . .

# installing all dependencies (including dev deps for TypeScript compilation)
RUN npm ci

# Increase Node heap during build to avoid OOM on Render builders
ENV NODE_OPTIONS=--max-old-space-size=2048

# build the TypeScript application
RUN npm run build:render

# container exposed network port number
EXPOSE 3000

# command to run within the container
CMD [ "npm", "start" ]