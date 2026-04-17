const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const PARENT_SEED_PASSWORD = process.env.DEV_PARENT_PASSWORD || "password123";
const SALT_ROUNDS = 12;

async function getOrCreateParent(email, familyId) {
	const passwordHash = await bcrypt.hash(PARENT_SEED_PASSWORD, SALT_ROUNDS);

	return prisma.user.upsert({
		where: { email },
		create: {
			email,
			passwordHash,
			role: "PARENT",
			familyId,
		},
		update: {
			passwordHash,
			familyId,
			role: "PARENT",
		},
	});
}

async function main() {
	// Minimal-but-useful seed: two families with parent users, members,
	// and a handful of event/task categories each.
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

	const andersonParent = await getOrCreateParent(
		"anderson.parent@example.com",
		familyOne.id,
	);
	const brownParent = await getOrCreateParent(
		"brown.parent@example.com",
		familyTwo.id,
	);

	const [andersonAdult, brownAdult] = await Promise.all([
		prisma.familyMember.create({
			data: {
				firstName: "Alice",
				lastName: "Anderson",
				role: "ADULT",
				familyId: familyOne.id,
				userId: andersonParent.id,
			},
		}),
		prisma.familyMember.create({
			data: {
				firstName: "Bob",
				lastName: "Brown",
				role: "ADULT",
				familyId: familyTwo.id,
				userId: brownParent.id,
			},
		}),
	]);

	// Additional family members so assignment and calendar views
	// have a richer set of people per family.
	await prisma.familyMember.createMany({
		data: [
			{
				firstName: "Charlie",
				lastName: "Anderson",
				role: "CHILD",
				familyId: familyOne.id,
			},
			{
				firstName: "Daisy",
				lastName: "Anderson",
				role: "CHILD",
				familyId: familyOne.id,
			},
			{
				firstName: "Chris",
				lastName: "Brown",
				role: "CHILD",
				familyId: familyTwo.id,
			},
			{
				firstName: "Ella",
				lastName: "Brown",
				role: "CHILD",
				familyId: familyTwo.id,
			},
		],
		skipDuplicates: true,
	});

	// Family-scoped event categories
	const eventCategories = await prisma.eventCategory.createMany({
		data: [
			{ name: "School", color: "#1976d2", familyId: familyOne.id },
			{ name: "Hobby", color: "#9c27b0", familyId: familyOne.id },
			{ name: "Doctor", color: "#d32f2f", familyId: familyOne.id },
			{ name: "Family", color: "#388e3c", familyId: familyOne.id },
			{ name: "School", color: "#1976d2", familyId: familyTwo.id },
			{ name: "Hobby", color: "#9c27b0", familyId: familyTwo.id },
			{ name: "Doctor", color: "#d32f2f", familyId: familyTwo.id },
			{ name: "Family", color: "#388e3c", familyId: familyTwo.id },
		],
		skipDuplicates: true,
	});

	// Family-scoped task categories
	await prisma.taskCategory.createMany({
		data: [
			{ name: "Chore", color: "#ffa000", familyId: familyOne.id },
			{ name: "Homework", color: "#7b1fa2", familyId: familyOne.id },
			{ name: "Errand", color: "#0288d1", familyId: familyOne.id },
			{ name: "Chore", color: "#ffa000", familyId: familyTwo.id },
			{ name: "Homework", color: "#7b1fa2", familyId: familyTwo.id },
			{ name: "Errand", color: "#0288d1", familyId: familyTwo.id },
		],
		skipDuplicates: true,
	});

	// Create a couple of example events for the first family so
	// the calendar has something to show when using seed data.
	const firstCategory = await prisma.eventCategory.findFirst({
		where: { familyId: familyOne.id },
		orderBy: { id: "asc" },
	});

	if (firstCategory) {
		const now = new Date();
		const inTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
		const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
		const tomorrowPlusHour = new Date(tomorrow.getTime() + 60 * 60 * 1000);

		await prisma.event.createMany({
			data: [
				{
					title: "Parent-teacher meeting",
					description: "Discuss progress with teacher.",
					startTime: now,
					endTime: inTwoHours,
					categoryId: firstCategory.id,
					createdBy: andersonParent.id,
					familyId: familyOne.id,
				},
				{
					title: "Soccer practice",
					description: "Weekly practice at local field.",
					startTime: tomorrow,
					endTime: tomorrowPlusHour,
					categoryId: firstCategory.id,
					createdBy: andersonParent.id,
					familyId: familyOne.id,
				},
			],
		});
	}
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
