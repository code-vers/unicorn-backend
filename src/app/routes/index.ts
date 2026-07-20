import { Router } from 'express';

import { AuthRoutes } from '../modules/auth/auth.routes';
import { DriverRoutes } from '../modules/driver/driver.routes';
import { DropOffChargeRoutes } from '../modules/dropOffCharge/dropOffCharge.routes';
import { LocationRoutes } from '../modules/location/location.routes';
import { PricingRoutes } from '../modules/pricing/pricing.routes';
import { UserRoutes } from '../modules/user/user.routes';
import { VehicleRoutes } from '../modules/vehicle/vehicle.routes';
import { SettingRoutes } from '../modules/setting/setting.routes';
import { BookingRoutes } from '../modules/booking/booking.routes';

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
  },
  {
    path: '/drivers',
    route: DriverRoutes
  },
  {
    path: '/drop-off-charges',
    route: DropOffChargeRoutes
  },
  {
    path: '/settings',
    route: SettingRoutes
  },

  {
    path: '/pricing',
    route: PricingRoutes
  },
  {
    path: '/bookings',
    route: BookingRoutes
  }
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
