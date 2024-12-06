# Gospel Initiative


## Commands

- Create new SQL migration file: `npx prisma migrate dev --name init`
- Run TypeScript commands: `npx ts-node script.ts`
- open Prisma GUI Database editor: `npx prisma studio`
- Start Express Node.js server: `node app.js`


## On Heroku

- After a build, startup the Prisma DB:
    - `npx prisma migrate dev --name init`
    - `npx prisma generate`