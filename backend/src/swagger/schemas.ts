/**
 * @openapi
 * components:
 *   schemas:
 *     AppUser:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique user identifier
 *         email:
 *           type: string
 *           format: email
 *           description: User's login email (unique)
 *         name:
 *           type: string
 *           nullable: true
 *           description: Full name
 *         dob:
 *           type: string
 *           format: date
 *           nullable: true
 *           description: Date of birth
 *         bio:
 *           type: string
 *           nullable: true
 *           description: Short user biography
 *         avatarUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: URL to user's avatar image
 *         matches:
 *           type: array
 *           items:
 *             type: object
 *           description: Array of Match objects (see Match schema)
 *         swipes:
 *           type: array
 *           items:
 *             type: object
 *           description: Array of Swipe objects (see Swipe schema)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the user was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the user was last updated
 *
 *     Pet:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique pet identifier
 *         name:
 *           type: string
 *           description: e.g. "Buddy" or "Whiskers"
 *         type:
 *           type: string
 *           description: Species or category, e.g. "Dog", "Cat"
 *         description:
 *           type: string
 *           nullable: true
 *           description: Breed, color, age, personality, etc.
 *         photoUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: URL to pet’s photo
 *         matches:
 *           type: array
 *           items:
 *             type: object
 *           description: Array of Match objects
 *         swipes:
 *           type: array
 *           items:
 *             type: object
 *           description: Array of Swipe objects
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     Match:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique match identifier
 *         user:
 *           type: object
 *           description: The user who saw this pet (AppUser schema)
 *         pet:
 *           type: object
 *           description: The pet that was shown (Pet schema)
 *         matchedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the match was created
 *
 *     Swipe:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique swipe identifier
 *         user:
 *           type: object
 *           description: The user who swiped (AppUser schema)
 *         pet:
 *           type: object
 *           description: The pet that was swiped on (Pet schema)
 *         liked:
 *           type: boolean
 *           description: true = “Yes, adopt!”, false = “Pass”
 *         swipedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the swipe occurred
 */
