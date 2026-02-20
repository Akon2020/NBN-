# AGENTS.md - Backend (NestJS)

## Quick Reference

- **Framework**: NestJS 11 with TypeORM
- **Language**: TypeScript (ES2021 target, CommonJS modules)
- **Database**: PostgreSQL via `DATABASE_URL`
- **Port**: 3000 (binds to `0.0.0.0`)
- **Build**: `npm run build` → outputs to `dist/`
- **Run**: `node dist/main.js`
- **Dev**: `npm run start:dev` (watch mode)
- **API Docs**: Swagger at `/api-docs/`

## Directory Structure

```
Backend/
├── src/
│   ├── main.ts                          # Bootstrap, CORS, Swagger, ValidationPipe
│   ├── app.module.ts                    # Root module, TypeORM config
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts  # @CurrentUser() param decorator
│   │   │   └── roles.decorator.ts         # @Roles() metadata decorator
│   │   └── guards/
│   │       ├── jwt-auth.guard.ts          # @UseGuards(JwtAuthGuard)
│   │       └── roles.guard.ts             # @UseGuards(RolesGuard)
│   ├── entities/
│   │   ├── index.ts                       # Barrel exports
│   │   ├── user.entity.ts                 # User + UserRole + UserStatus enums
│   │   ├── property.entity.ts             # Property + PropertyCategory + PropertyType enums
│   │   ├── rental-property.entity.ts      # RentalProperty (1:1 with Property)
│   │   ├── sale-property.entity.ts        # SaleProperty (1:1 with Property)
│   │   ├── property-image.entity.ts       # PropertyImage (N:1 with Property)
│   │   ├── property-phone.entity.ts       # PropertyPhone (N:1 with Property)
│   │   ├── property-score.entity.ts       # PropertyScore (1:1 with Property)
│   │   ├── favorite.entity.ts             # Favorite (N:1 User, N:1 Property)
│   │   ├── proposal.entity.ts             # Proposal (N:1 Property)
│   │   └── activity-log.entity.ts         # ActivityLog (N:1 User)
│   └── modules/
│       ├── auth/
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts         # POST /api/auth/register, /api/auth/login
│       │   ├── auth.service.ts            # register(), login(), validateUser(), generateToken()
│       │   ├── jwt.strategy.ts            # Passport JWT strategy
│       │   └── dto/
│       │       ├── register.dto.ts        # fullName, email, password (NO role field)
│       │       └── login.dto.ts           # email, password
│       ├── users/
│       │   ├── users.module.ts
│       │   ├── users.controller.ts        # CRUD + /me endpoints
│       │   ├── users.service.ts
│       │   └── dto/
│       │       ├── create-user.dto.ts     # Admin-only: fullName, email, password, role
│       │       └── update-user.dto.ts
│       ├── properties/
│       │   ├── properties.module.ts
│       │   ├── properties.controller.ts   # CRUD + image upload (multer)
│       │   ├── properties.service.ts      # Ownership checks, QueryBuilder search
│       │   └── dto/
│       │       ├── create-property.dto.ts
│       │       ├── update-property.dto.ts
│       │       └── search-property.dto.ts # Filters: category, type, quartier, price range, bedrooms
│       ├── favorites/
│       │   ├── favorites.module.ts
│       │   ├── favorites.controller.ts
│       │   ├── favorites.service.ts
│       │   └── dto/
│       │       └── create-favorite.dto.ts
│       └── proposals/
│           ├── proposals.module.ts
│           ├── proposals.controller.ts
│           ├── proposals.service.ts
│           └── dto/
│               └── create-proposal.dto.ts
├── uploads/
│   └── properties/                        # Uploaded property images (UUID filenames)
├── dist/                                  # Compiled output (do not edit)
├── package.json
├── tsconfig.json
└── nest-cli.json
```

## Module Architecture Pattern

Every feature module follows the same NestJS pattern:

```typescript
// 1. Module: registers controller, service, and TypeORM entities
@Module({
  imports: [TypeOrmModule.forFeature([Entity1, Entity2])],
  controllers: [FeatureController],
  providers: [FeatureService],
  exports: [FeatureService],  // if needed by other modules
})

// 2. Controller: handles HTTP, delegates to service
@Controller('api/feature')
export class FeatureController {
  constructor(private service: FeatureService) {}
}

// 3. Service: business logic, database queries
@Injectable()
export class FeatureService {
  constructor(
    @InjectRepository(Entity) private repo: Repository<Entity>,
  ) {}
}

// 4. DTOs: validation with class-validator
export class CreateFeatureDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
```

## Authentication & Authorization

### Protecting an Endpoint

```typescript
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../entities/user.entity';

// Auth required (any authenticated user)
@UseGuards(JwtAuthGuard)
@Get('me')
getProfile(@CurrentUser() user: User) { ... }

// Admin only
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Get()
findAll() { ... }
```

### JWT Payload Structure
```typescript
{
  sub: number;      // user.idUser
  email: string;    // user.email
  role: UserRole;   // user.role ('admin' | 'agent' | 'consultant')
}
```

### Token Config
- Secret: `process.env.JWT_SECRET` || `'nyumbani-jwt-secret'`
- Expiration: `7d`
- Extraction: `Authorization: Bearer <token>`

## Validation Pipeline

Global `ValidationPipe` is configured in `main.ts`:
- `whitelist: true` — strips unknown properties
- `forbidNonWhitelisted: true` — throws error on unknown properties
- `transform: true` — auto-transforms payloads to DTO instances

Always use `class-validator` decorators in DTOs:
```typescript
import { IsString, IsNotEmpty, IsEmail, MinLength, IsOptional, IsEnum } from 'class-validator';
```

## Database Conventions

### TypeORM Configuration
```typescript
TypeOrmModule.forRoot({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  autoLoadEntities: true,
  synchronize: true,  // Auto-sync schema (dev mode)
  ssl: false,
})
```

### Entity Conventions
- All entities use `@PrimaryGeneratedColumn({ name: 'idXxx', type: 'bigint' })`
- Column names use camelCase in TypeScript, TypeORM auto-maps to snake_case in DB
- Relations use explicit `@JoinColumn({ name: 'idXxx' })` with foreign key columns
- Soft delete is NOT used — `@DeleteDateColumn` is not present
- Timestamps: `@CreateDateColumn()` and `@UpdateDateColumn()` on all entities

### Adding a New Entity
1. Create `src/entities/<name>.entity.ts`
2. Export it from `src/entities/index.ts`
3. Import in the relevant module's `TypeOrmModule.forFeature([...])`
4. TypeORM auto-syncs the schema (no migration needed in dev)

## Error Handling

Use NestJS built-in exceptions:
```typescript
import {
  NotFoundException,       // 404
  ConflictException,       // 409
  UnauthorizedException,   // 401
  ForbiddenException,      // 403
  BadRequestException,     // 400
} from '@nestjs/common';
```

Error messages should be in French for user-facing errors:
```typescript
throw new NotFoundException('Propriété non trouvée');
throw new ForbiddenException("Vous n'avez pas le droit de modifier cette propriété");
```

## File Upload

- Library: `multer` (via `@nestjs/platform-express`)
- Storage: `Backend/uploads/properties/`
- Filenames: UUID-based to avoid conflicts
- Endpoint: `POST /api/properties/:id/images` (multipart/form-data)

## Ownership Check Pattern

For update/delete operations on properties:
```typescript
if (currentUser.role !== UserRole.ADMIN && property.idUserCreator !== currentUser.idUser) {
  throw new ForbiddenException("Vous n'avez pas le droit...");
}
```

## Adding a New Module

1. Create directory `src/modules/<name>/`
2. Create `<name>.module.ts`, `<name>.controller.ts`, `<name>.service.ts`
3. Create `dto/` folder with DTOs
4. Register module in `src/app.module.ts` imports
5. Routes are prefixed with `/api/<name>` in the controller decorator
6. Build: `npm run build`

## Key Dependencies

| Package                   | Purpose                    |
|---------------------------|----------------------------|
| `@nestjs/core`            | NestJS framework           |
| `@nestjs/typeorm` + `typeorm` | ORM + PostgreSQL       |
| `@nestjs/jwt` + `@nestjs/passport` | JWT authentication |
| `passport-jwt`            | JWT strategy for Passport  |
| `bcryptjs`                | Password hashing           |
| `class-validator` + `class-transformer` | DTO validation |
| `@nestjs/swagger`         | OpenAPI documentation      |
| `multer`                  | File upload handling       |
| `uuid`                    | UUID generation for files  |
