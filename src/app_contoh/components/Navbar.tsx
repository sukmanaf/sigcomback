"use client";

import { Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem } from "@/components/ui/menubar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import menuData from "../data/menuData.json";

export default function Navbar() {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-800 text-white">
      {/* Logo */}
      <div className="text-lg font-bold">Logo</div>

      {/* Menu */}
      <Menubar className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
        {menuData.map((menu) => (
          <MenubarMenu key={menu.id}>
            <MenubarTrigger>{menu.label}</MenubarTrigger>
            <MenubarContent>
              {menu.submenu.map((sub) => (
                <MenubarItem key={sub.id}>{sub.label}</MenubarItem>
              ))}
            </MenubarContent>
          </MenubarMenu>
        ))}
      </Menubar>

      {/* Tools Menu */}
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Tools</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>Draw Polygon</MenubarItem>
            <MenubarItem>Edit Polygon</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>

      {/* User Icon */}
      <Avatar>
        <AvatarImage src="https://github.com/shadcn.png" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
    </div>
  );
}