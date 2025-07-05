# Gospel Initiative


## Commands

- Create new SQL migration file: `npx prisma migrate dev --name init`
- Run TypeScript commands: `npx ts-node script.ts`
- open Prisma GUI Database editor: `npx prisma studio`
- Start Express Node.js server: `node app.js`


## On Heroku

### How to install Prisma onto Heroku by scratch
- Assuming that git repository has been connected and `~/prisma/schema.prisma` exists.
- 

- After a build, startup the Prisma DB:
    - `npx prisma migrate dev --name init`
    - `npx prisma generate`


## Heroku Postgres Steps

- Go to Heroku Dashboard settings and pull master branch.
- Go to console on Heroku.
- `cd prisma`, `cat schema.prisma` without any auto-complete commands to make sure your commands are there.
- `prisma migrate deploy`

### Old
- On Bash, command prompt
   - `prisma db pull`
   - `prisma generate`
   - `npx prisma db push`
   - If changes are needed...
       - `npx prisma migrate dev --name changes`