
const prisma = require('../misc/prisma-client');

module.exports.getAllActiveBeacons = async (userId = null) => {
    const currentDate = new Date();
    const beacons = await prisma.beacon.findMany({
        where: {
            activeUntil: { gt: currentDate }, // Filter for active beacons
            userId: { not: userId },
        },
        include: includeClause,
    });

    const globalBeacons = await prisma.globalBeacon.findMany({
        where: {
            activeUntil: { gt: currentDate }, // Filter for active beacons
        },
        include: {
            activities: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
            user: {
                select: {
                    name: true,
                    icon: true,
                },
            },
        },
    });

    return [
        ...mapBeaconWithAdditionalData(beacons),
        ...mapGlobalBeaconWithAdditionalData(globalBeacons)
    ];
}

module.exports.getExpiredBeacons = async (userId) => {
    const currentDate = new Date();
    const beacons = await prisma.beacon.findMany({
        where: {
            userId,
            activeUntil: { lt: currentDate }, // Filter for expired beacons
        },
        include: includeClause,
    });
    return mapBeaconWithAdditionalData(beacons);
}

const includeClause = {
    activities: {
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    },
    user: {
        select: {
            name: true,
            icon: true,
        },
    },
    one: {
        select: {
            name: true,
            icon: true,
            stage: true,
            category: true
        },
    },
};

const mapBeaconWithAdditionalData = (beacons) => {
    return beacons.map(beacon => ({
        ...beacon,
        user: {
            name: beacon.user.name,
            icon: beacon.user.icon,
        },
        one: {
            name: beacon.one.name,
            icon: beacon.one.icon,
            stage: beacon.one.stage,
            category: beacon.one.category
        },
        activities: beacon.activities.map(activity => ({
            ...activity,
            username: activity.user.name,
        })),
    }));
}

const mapGlobalBeaconWithAdditionalData = (beacons) => {
    return beacons.map(beacon => ({
        ...beacon,
        global: true,
        activities: beacon.activities.map(activity => ({
            ...activity,
            username: activity.user.name,
        })),
    }));
}