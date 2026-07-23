import { OpenApiGeneratorV3, OpenAPIRegistry, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { registerAuthSwagger } from '../modules/auth/auth.swagger';
import { registerDriverSwagger } from '../modules/driver/driver.swagger';
import { registerDropOffChargeSwagger } from '../modules/dropOffCharge/dropOffCharge.swagger';
import { registerLocationSwagger } from '../modules/location/location.swagger';
import { registerUserSwagger } from '../modules/user/user.swagger';
import { registerVehicleSwagger } from '../modules/vehicle/vehicle.swagger';
import { registerSettingSwagger } from '../modules/setting/setting.swagger';
import { registerBookingSwagger } from '../modules/booking/booking.swagger';
import { registerPricingSwagger } from '../modules/pricing/pricing.swagger';
import { registerNotificationSwagger } from '../modules/notification/notification.swagger';
import { registerFeatureSwagger } from '../modules/feature/feature.swagger';
import { registerSupportSwagger } from '../modules/support/support.swagger';

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
registerDriverSwagger(registry, bearerAuth);
registerDropOffChargeSwagger(registry, bearerAuth);
registerSettingSwagger(registry, bearerAuth);
registerBookingSwagger(registry, bearerAuth);
registerPricingSwagger(registry, bearerAuth);
registerNotificationSwagger(registry, bearerAuth);
registerFeatureSwagger(registry, bearerAuth);
registerSupportSwagger(registry, bearerAuth);

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
