import {NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ArrayComponent } from './Components/Classification/array/array.component';
import { ClassificationPageComponent } from './Components/Classification/classification-page/classification-page.component';
import { TemporalComponent } from './Components/Classification/temporal/temporal.component';
import { MainPageComponent } from './Components/main-page/main-page.component';


const routes: Routes = [
  { path: '', redirectTo: 'main/classification', pathMatch:'full'},
  //{path:'welcome', component:WelcomeComponent},
  {path:'main', component:MainPageComponent, children:[
    {path:'classification', component:ClassificationPageComponent, children:[
      {path:'temporal', component:TemporalComponent},
      {path:'array', component:ArrayComponent},
      {path:'**', component:ArrayComponent}
    ]},
  ]},
  {path:'temporal', component:TemporalComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
