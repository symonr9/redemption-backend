// deleteData.js
const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

async function promptUser(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim().toUpperCase() === 'Y');
        });
    });
}

async function deleteAllData() {
    await prisma.beaconActivity.deleteMany({});
    await prisma.beacon.deleteMany({});
    await prisma.actionStep.deleteMany({});
    await prisma.storyChapter.deleteMany({});
    await prisma.one.deleteMany({});
    await prisma.log.deleteMany({});
    await prisma.user.deleteMany({});
}

async function main() {
    const firstConfirmation = await promptUser('Are you sure you want to delete all data? (Y/N): ');
    if (!firstConfirmation) {
        console.log('Operation canceled.');
        rl.close();
        return;
    }

    const secondConfirmation = await promptUser('Are you really sure? (Y/N): ');
    if (!secondConfirmation) {
        console.log('Operation canceled.');
        rl.close();
        return;
    }

    try {
        await deleteAllData();
        console.log('All data deleted successfully.');
    } catch (error) {
        console.error('Error deleting data:', error);
    } finally {
        rl.close();
        await prisma.$disconnect();
    }
}

main();
