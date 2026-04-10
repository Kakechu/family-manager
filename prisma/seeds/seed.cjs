const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
	// Minimal seed: two families with a parent user and member each
	const familyOne = await prisma.family.create({
		data: {
			name: "Anderson Family",
		},
	});

	const familyTwo = await prisma.family.create({
		data: {
			name: "Brown Family",
		},
	});

	await prisma.user.createMany({
		data: [
			{
				email: "anderson.parent@example.com",
				// Placeholder hash for development/testing only
				passwordHash: "dev-seed-password-hash",
				role: "PARENT",
				familyId: familyOne.id,
			},
			{
				email: "brown.parent@example.com",
				passwordHash: "dev-seed-password-hash",
				role: "PARENT",
				familyId: familyTwo.id,
			},
		],
	});

	await prisma.familyMember.createMany({
		data: [
			{
				firstName: "Alice",
				lastName: "Anderson",
				role: "ADULT",
				familyId: familyOne.id,
			},
			{
				firstName: "Bob",
				lastName: "Brown",
				role: "ADULT",
				familyId: familyTwo.id,
			},
		],
	});
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
