// backend/scripts/seedPets.ts
import "reflect-metadata";
import { DataSource } from "typeorm";
import ormconfig from "../src/config/ormconfig";
import { AppUser } from "../src/entities/User";
import { Pet } from "../src/entities/Pet";
import { Match } from "../src/entities/Match";
import { Swipe } from "../src/entities/Swipe";
import { faker } from "@faker-js/faker";
import { assignPetsToUser } from "../src/utils/assignmentHelper";

async function main() {
  const ds = new DataSource(ormconfig);
  await ds.initialize();

  const userRepo = ds.getRepository(AppUser);
  const petRepo = ds.getRepository(Pet);
  const matchRepo = ds.getRepository(Match);
  const swipeRepo = ds.getRepository(Swipe);

  console.log("🔄 Deleting all swipes, matches, and pets…");
  // DELETE in dependency order to avoid FK errors
  await ds.createQueryBuilder().delete().from(Swipe).execute();
  await ds.createQueryBuilder().delete().from(Match).execute();
  await ds.createQueryBuilder().delete().from(Pet).execute();
  console.log("✅ All old data cleared.");

  console.log("🌱 Seeding 50 realistic pets…");
  const photoUrls = [
    // cats
    "https://www.operationkindness.org/wp-content/uploads/blog-june-adopt-shelter-cat-month-operation-kindness.jpg",
    "https://img1.wsimg.com/isteam/ip/8bf9e9e9-08ac-4ff1-8e1d-b6d1e3d7c48e/Triplets.jpg",
    "https://bestfriends.org/sites/default/files/resource_article_images/Cat-enrichment-Unnamed-Female-Kitty-A-578-Playing-3889_Sellers_1.jpg",
    "https://assets-au-01.kc-usercontent.com/ab37095e-a9cb-025f-8a0d-c6d89400e446/1bb10d4c-be00-4bc5-b5a5-989e7cb67f2b/article-adopting-cat-considerations.jpg",
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSRw5Q83ftw9c_cDmSGlLTYqsaEKws7IjqhqUu4xxPJAWP6--BjG4lovAu_jz5OJCpSQik&usqp=CAU",
    // dogs
    "https://lifelineanimal.org/wp-content/uploads/2022/01/state-of-the-shelters-blog-post-header.jpg",
    "https://longwoodvetcenter.com/wp-content/uploads/2023/05/Animal-Shelters-in-Pennsylvania.jpg",
  ];

  const catBreeds = ["Siamese", "Persian", "Maine Coon", "Ragdoll", "Bengal"];
  const dogBreeds = [
    "Labrador Retriever",
    "German Shepherd",
    "Golden Retriever",
    "Bulldog",
    "Beagle",
  ];
  const coatColors = [
    "black",
    "white",
    "orange",
    "tabby",
    "cream",
    "calico",
    "gray",
  ];
  const catActions = [
    "loves chasing feather toys",
    "enjoys sunbathing by the window",
    "greets you with a purr when you get home",
    "is happiest curled up in a lap",
    "explores cardboard boxes for hours",
    "watches birds through the window",
  ];
  const dogActions = [
    "fetches tennis balls endlessly",
    "joins you on morning jogs",
    "splashes in every puddle",
    "rides happily in the car",
    "is calm and well-behaved in public",
    "loves a good belly rub",
  ];
  const extras = [
    "House-trained and crate-trained.",
    "Great with children and other pets.",
    "Knows basic commands: sit, stay, and come.",
    "Affectionate but independent.",
    "Ideal for families and apartments alike.",
    "Quiet at night and respectful of furniture.",
  ];

  const newPets: Pet[] = [];
  for (let i = 0; i < 50; i++) {
    const type = faker.helpers.arrayElement(["Cat", "Dog"]);
    const breed =
      type === "Cat"
        ? faker.helpers.arrayElement(catBreeds)
        : faker.helpers.arrayElement(dogBreeds);
    const age = faker.number.int({ min: 1, max: 12 });
    const color = faker.helpers.arrayElement(coatColors);
    const action = faker.helpers.arrayElement(
      type === "Cat" ? catActions : dogActions,
    );
    const extra = faker.helpers.arrayElement(extras);
    const name = faker.name.firstName();
    const photoUrl = photoUrls[i % photoUrls.length];

    const description = `${age}-year-old ${breed} ${type.toLowerCase()} with a ${color} coat who ${action}. ${extra}`;

    newPets.push(petRepo.create({ name, type, description, photoUrl }));
  }

  await petRepo.save(newPets);
  console.log(`✅ Inserted ${newPets.length} pets.`);

  const users = await userRepo.find();
  console.log(
    `👥 Found ${users.length} users — assigning every pet to each user…`,
  );
  for (const user of users) {
    const added = await assignPetsToUser(user.id); // no limit, assigns all
    console.log(`   • ${user.email}: assigned ${added} pets`);
  }

  console.log("🎉 Pet seeding complete!");
  await ds.destroy();
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
