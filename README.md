# Gospel Initiative


## Commands

- Create new SQL migration file: `npx prisma migrate dev --name init`
- Run TypeScript commands: `npx ts-node script.ts`
- open Prisma GUI Database editor: `npx prisma studio`
- Start Express Node.js server: `node app.js`


## On Heroku
- If you made changes to your schema and want those changes in the database:
    - On your local machine (not Heroku), run: `npx prisma migrate dev --name <migration_name>`
    - This will generate a new migration file in prisma/migrations.
- Commit and push the changes to your remote Heroku branch.
- Run the migration on Heroku. In the Heroku console, run: `npx prisma migrate deploy`

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