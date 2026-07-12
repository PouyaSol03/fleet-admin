import { createBrowserRouter, Navigate } from "react-router";
import { AuthLayout } from "../layout/AuthLayout";
import { DashboardLayout } from "../layout/DashboardLayout";
import AccessGroups from "../pages/AccessGroups";
import Dashboard from "../pages/Dashboard";
import Drivers from "../pages/Drivers";
import Inspections from "../pages/Inspections";
import MissionCalendar from "../pages/MissionCalendar";
import Missions from "../pages/Missions";
import Reports from "../pages/Reports";
import Requests from "../pages/Requests";
import SplashTest from "../pages/SplashTest";
import Tracking from "../pages/Tracking";
import Unauthorized from "../pages/Unauthorized";
import Users from "../pages/Users";
import VehicleGroups from "../pages/VehicleGroups";
import VehicleMap from "../pages/VehicleMap";
import Vehicles from "../pages/Vehicles";
import VehicleTypes from "../pages/VehicleTypes";
import { LoginPage } from "../pages/auth/LoginPage";
import { ProtectedRoute, PublicRoute } from "./routeGuards";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
  },
  {
    element: (
      <PublicRoute>
        <AuthLayout />
      </PublicRoute>
    ),
    children: [
      {
        path: "/login",
        element: <LoginPage />,
      },
    ],
  },
  {
    path: "/unauthorized",
    element: <Unauthorized />,
  },
  {
    path: "/splash-test",
    element: <SplashTest />,
  },
  {
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "/dashboard",
        element: <Dashboard />,
      },
      {
        path: "/users",
        element: <Users />,
      },
      {
        path: "/access-groups",
        element: <AccessGroups />,
      },
      {
        path: "/drivers",
        element: <Drivers />,
      },
      {
        path: "/vehicles",
        element: <Vehicles />,
      },
      {
        path: "/tracking",
        element: <Tracking />,
      },
      {
        path: "/vehicle-map",
        element: <VehicleMap />,
      },
      {
        path: "/vehicle-groups",
        element: <VehicleGroups />,
      },
      {
        path: "/vehicle-types",
        element: <VehicleTypes />,
      },
      {
        path: "/inspections",
        element: <Inspections />,
      },
      {
        path: "/missions",
        element: <Missions />,
      },
      {
        path: "/missions-calendar",
        element: <MissionCalendar />,
      },
      {
        path: "/requests",
        element: <Requests />,
      },
      {
        path: "/reports",
        element: <Reports />,
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },
]);
