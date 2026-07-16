import { OpenApiGeneratorV3, OpenAPIRegistry, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { registerAuthSwagger } from '../modules/auth/auth.swagger';
import { registerLocationSwagger } from '../modules/location/location.swagger';
import { registerUserSwagger } from '../modules/user/user.swagger';
import { registerVehicleSwagger } from '../modules/vehicle/vehicle.swagger';

// Extend Zod to support OpenAPI
extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

// Register Bearer Auth
const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT'
});

// Register Module Routes
registerAuthSwagger(registry, bearerAuth);
registerUserSwagger(registry, bearerAuth);
registerLocationSwagger(registry, bearerAuth);
registerVehicleSwagger(registry, bearerAuth);

export const generateSwaggerDocs = () => {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Backend API Boilerplate',
      description: 'API Documentation for the backend boilerplate.'
    },
    servers: [{ url: '/' }]
  });
};
