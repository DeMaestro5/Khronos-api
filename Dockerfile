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

# build the TypeScript application with memory optimization
RUN NODE_OPTIONS='--max-old-space-size=1024' npm run build:render

# clean up dev dependencies to reduce image size (optional)
RUN npm prune --production

# container exposed network port number
EXPOSE 3000

# command to run within the container
CMD [ "npm", "start" ]