import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import Home from "../pages/home";
import Info from "../pages/info";
import NotFound from "../pages/error/NotFound";
import PageLayout from "../pages/PageLayout";
import Picks from "../pages/picks";
import GameT1 from "../pages/game-t1";
import PickManagement from "../pages/pick-management";
import Gamedata from "../pages/gamedata";
import RandomPick from "../pages/random-pick";

const ProductLayout = lazy(() => import("../pages/product/ProductLayout"));
const ProductList = lazy(() => import("../pages/product"));
const ProductDetail = lazy(() => import("../pages/product/ProductDetail"));

const ProductRouter = [
  {
    path: "/product",
    element: <ProductLayout />,
    children: [
      {
        path: "/product",
        element: <ProductList />,
      },
      {
        path: "/product/:id",
        element: <ProductDetail />,
      },
    ],
  },
];

const router = createBrowserRouter([
  {
    path: "/",
    element: <PageLayout />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/home",
        element: <Home />,
      },
      {
        path: "/info",
        element: <Info />,
      },
      {
        path: "/picks",
        element: <Picks />,
      },
      {
        path: "/game-t1",
        element: <GameT1 />,
      },
      {
        path: "/pick-management",
        element: <PickManagement />,
      },
      {
        path: "/gamedata",
        element: <Gamedata />,
      },
      {
        path: "/random-pick",
        element: <RandomPick />,
      },
      ...ProductRouter,
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

export default router;
