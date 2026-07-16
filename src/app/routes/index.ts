import { Router } from 'express';

import { AuthRoutes } from '../modules/auth/auth.routes';
import { LocationRoutes } from '../modules/location/location.routes';
import { UserRoutes } from '../modules/user/user.routes';
import { VehicleRoutes } from '../modules/vehicle/vehicle.routes';

const router = Router();

const moduleRoutes = [
  {
    path: '/auth',
    route: AuthRoutes
  },
  {
    path: '/users',
    route: UserRoutes
  },
  {
    path: '/locations',
    route: LocationRoutes
  },
  {
    path: '/vehicles',
    route: VehicleRoutes
  }
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
