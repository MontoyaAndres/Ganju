import { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '@ganju/db';

// types
import { AppEnv } from '../../types';

const listGroups = async (c: Context<AppEnv>) => {
  const dbInstance = db.create(c);

  const groups = await dbInstance.query.toolGroup.findMany({
    with: {
      toolDefinitions: true
    }
  });

  return c.json(groups);
};

const listMcpServers = async (c: Context<AppEnv>) => {
  const dbInstance = db.create(c);

  const servers = await dbInstance
    .select({
      id: db.schema.mcpServerCatalog.id,
      slug: db.schema.mcpServerCatalog.slug,
      name: db.schema.mcpServerCatalog.name,
      description: db.schema.mcpServerCatalog.description,
      icon: db.schema.mcpServerCatalog.icon,
      transport: db.schema.mcpServerCatalog.transport,
      authKind: db.schema.mcpServerCatalog.authKind,
      defaultScopes: db.schema.mcpServerCatalog.defaultScopes
    })
    .from(db.schema.mcpServerCatalog)
    .where(eq(db.schema.mcpServerCatalog.verified, true));

  return c.json(servers);
};

export const CatalogController = {
  listGroups,
  listMcpServers
};
